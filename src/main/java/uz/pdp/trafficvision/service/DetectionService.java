package uz.pdp.trafficvision.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import uz.pdp.trafficvision.exception.FileStorageException;
import uz.pdp.trafficvision.exception.ResourceNotFoundException;
import uz.pdp.trafficvision.model.dto.detection.DetectedSignDto;
import uz.pdp.trafficvision.model.dto.detection.DetectionResponse;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResult;
import uz.pdp.trafficvision.model.entity.DetectedSign;
import uz.pdp.trafficvision.model.entity.Detection;
import uz.pdp.trafficvision.model.entity.Image;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.model.enums.DetectionStatus;
import uz.pdp.trafficvision.repository.DetectedSignRepository;
import uz.pdp.trafficvision.repository.DetectionRepository;
import uz.pdp.trafficvision.repository.ImageRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DetectionService {

    private final ImageService imageService;
    private final PythonClientService pythonClientService;
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

            long startTime = System.currentTimeMillis();
            List<PythonDetectionResult> results = pythonClientService.detect(file);

            Detection finalDetection = detection;
            List<DetectedSign> detectedSigns = results.stream()
                    .map(result -> mapToDetectedSign(result, finalDetection))
                    .toList();
            detectedSignRepository.saveAll(detectedSigns);
            detection.getDetectedSigns().clear();
            detection.getDetectedSigns().addAll(detectedSigns);

            detection.setProcessingTimeMs(System.currentTimeMillis() - startTime);
            detection.setStatus(DetectionStatus.COMPLETED);
            return mapToResponse(detectionRepository.save(detection));
        } catch (RuntimeException exception) {
            detection.setStatus(DetectionStatus.FAILED);
            detectionRepository.save(detection);

            if (exception instanceof FileStorageException fileStorageException) {
                throw fileStorageException;
            }
            throw new FileStorageException("Detection failed");
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

    private DetectedSign mapToDetectedSign(PythonDetectionResult result, Detection detection) {
        return DetectedSign.builder()
                .detection(detection)
                .signType(result.getSignType())
                .confidence(result.getConfidence())
                .x(result.getX())
                .y(result.getY())
                .width(result.getWidth())
                .height(result.getHeight())
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
                .build();
    }
}
