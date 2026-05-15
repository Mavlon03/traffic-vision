package uz.pdp.trafficvision.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import uz.pdp.trafficvision.exception.FileStorageException;
import uz.pdp.trafficvision.exception.ResourceNotFoundException;
import uz.pdp.trafficvision.model.dto.detection.DetectedSignDto;
import uz.pdp.trafficvision.model.dto.detection.DetectionResponse;
import uz.pdp.trafficvision.model.dto.notification.DetectionNotification;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResponse;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResult;
import uz.pdp.trafficvision.model.entity.DetectedSign;
import uz.pdp.trafficvision.model.entity.Detection;
import uz.pdp.trafficvision.model.entity.Image;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.model.enums.DetectionStatus;
import uz.pdp.trafficvision.repository.DetectedSignRepository;
import uz.pdp.trafficvision.repository.DetectionRepository;
import uz.pdp.trafficvision.repository.ImageRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Yo'l belgisi aniqlash asosiy servisi.
 *
 * Jarayon:
 *  1. Rasm DB ga saqlanadi
 *  2. Python AI servisiga yuboriladi
 *  3. Natijalar DB ga saqlanadi
 *  4. WebSocket orqali foydalanuvchiga bildirishnoma yuboriladi
 *     (has_critical_sign = true bo'lsa ovozli ogohlantirish bilan)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DetectionService {

    // Kritik belgilar — tezkor ovozli ogohlantirish talab qilinadi
    private static final Set<String> CRITICAL_SIGN_TYPES = Set.of(
            "stop", "no_entry", "danger", "railway_crossing",
            "pedestrian_crossing", "children", "give_way", "traffic_signals"
    );

    private final ImageService imageService;
    private final PythonClientService pythonClientService;
    private final NotificationService notificationService;
    private final DetectionRepository detectionRepository;
    private final DetectedSignRepository detectedSignRepository;
    private final ImageRepository imageRepository;

    @Transactional(noRollbackFor = FileStorageException.class)
    public DetectionResponse detect(MultipartFile file, User currentUser) {
        Image image = imageService.saveImage(file, currentUser);
        Detection detection = Detection.builder()
                .image(image)
                .user(currentUser)
                .status(DetectionStatus.PENDING)
                .build();
        detection = detectionRepository.save(detection);

        try {
            detection.setStatus(DetectionStatus.PROCESSING);
            detection = detectionRepository.save(detection);

            PythonDetectionResponse pythonResponse = pythonClientService.detect(file);
            List<PythonDetectionResult> results = pythonResponse.getSigns();

            Detection finalDetection = detection;
            List<DetectedSign> detectedSigns = results.stream()
                    .map(result -> mapToDetectedSign(result, finalDetection))
                    .toList();
            detectedSignRepository.saveAll(detectedSigns);
            detection.getDetectedSigns().clear();
            detection.getDetectedSigns().addAll(detectedSigns);

            detection.setProcessingTimeMs(Math.round(pythonResponse.getProcessingTimeMs()));
            detection.setStatus(DetectionStatus.COMPLETED);
            Detection saved = detectionRepository.save(detection);

            // WebSocket orqali real-time bildirishnoma yuborish
            DetectionResponse response = mapToResponse(saved);
            sendWebSocketNotification(currentUser.getId(), response, saved.getProcessingTimeMs());

            return response;

        } catch (RuntimeException exception) {
            detection.setStatus(DetectionStatus.FAILED);
            detectionRepository.save(detection);

            if (exception instanceof FileStorageException fileStorageException) {
                throw fileStorageException;
            }
            throw new FileStorageException("Detection failed: " + exception.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public DetectionResponse getById(Long id) {
        Detection detection = detectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Detection not found with id: " + id));
        return mapToResponse(detection);
    }

    @Transactional(readOnly = true)
    public Page<DetectionResponse> getHistory(Long userId, Pageable pageable) {
        return detectionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToResponse);
    }

    // ─── Private yordamchi metodlar ────────────────────────────────────────────

    /**
     * Aniqlash natijasini WebSocket orqali foydalanuvchiga yuboradi.
     * Kritik belgi aniqlansa — qo'shimcha tezkor ogohlantirish chiqaradi.
     */
    private void sendWebSocketNotification(Long userId, DetectionResponse response, Long processingTimeMs) {
        try {
            List<DetectedSignDto> allSigns = response.getDetectedSigns();
            List<DetectedSignDto> criticalSigns = allSigns.stream()
                    .filter(sign -> CRITICAL_SIGN_TYPES.contains(
                            sign.getSignType() != null
                                    ? sign.getSignType().toLowerCase().replace(" ", "_")
                                    : ""))
                    .toList();

            boolean hasCritical = !criticalSigns.isEmpty();
            String alertMessage = buildAlertMessage(hasCritical ? criticalSigns : allSigns, hasCritical);

            DetectionNotification notification = DetectionNotification.builder()
                    .userId(userId)
                    .detectionId(response.getId())
                    .detectedSigns(allSigns)
                    .totalSigns(response.getTotalSigns())
                    .hasCriticalSign(hasCritical)
                    .alertMessage(alertMessage)
                    .imageUrl(response.getImageUrl())
                    .processingTimeMs(processingTimeMs)
                    .timestamp(LocalDateTime.now())
                    .build();

            notificationService.sendDetectionResult(userId, notification);

            // Kritik bo'lsa — qo'shimcha tezkor kanal orqali ham yuborish
            if (hasCritical) {
                notificationService.sendCriticalAlert(userId, criticalSigns);
            }

        } catch (Exception e) {
            // Bildirishnoma xatosi aniqlash natijasini to'xtatmasin
            log.error("WebSocket bildirishnoma yuborishda xato: {}", e.getMessage());
        }
    }

    private String buildAlertMessage(List<DetectedSignDto> signs, boolean isCritical) {
        StringBuilder sb = new StringBuilder();
        if (isCritical) sb.append("DIQQAT! ");
        for (DetectedSignDto sign : signs) {
            if (sign.getDescription() != null && !sign.getDescription().isBlank()) {
                sb.append(sign.getDescription()).append(". ");
            } else {
                sb.append("Belgi: ").append(sign.getSignType()).append(". ");
            }
        }
        return sb.toString().trim();
    }

    private DetectedSign mapToDetectedSign(PythonDetectionResult result, Detection detection) {
        return DetectedSign.builder()
                .detection(detection)
                .signType(result.getSignType())
                .confidence(result.getConfidence())
                .x(result.getX())
                .y(result.getY())
                .width(result.getWidth())
                .height(result.getHeight())
                .description(result.getDescription())
                .build();
    }

    private DetectionResponse mapToResponse(Detection detection) {
        List<DetectedSignDto> signs = detectedSignRepository.findByDetectionId(detection.getId()).stream()
                .map(this::mapToDto)
                .toList();

        return DetectionResponse.builder()
                .id(detection.getId())
                .status(detection.getStatus().name())
                .imageUrl(imageService.getImageUrl(detection.getImage().getFilePath()))
                .detectedSigns(signs)
                .processingTimeMs(detection.getProcessingTimeMs())
                .createdAt(detection.getCreatedAt())
                .build();
    }

    private DetectedSignDto mapToDto(DetectedSign sign) {
        return DetectedSignDto.builder()
                .id(sign.getId())
                .signType(sign.getSignType())
                .confidence(sign.getConfidence())
                .x(sign.getX())
                .y(sign.getY())
                .width(sign.getWidth())
                .height(sign.getHeight())
                .description(sign.getDescription())
                .build();
    }
}
