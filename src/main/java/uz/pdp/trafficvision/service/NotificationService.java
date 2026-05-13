package uz.pdp.trafficvision.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import uz.pdp.trafficvision.model.dto.notification.DetectionNotification;
import uz.pdp.trafficvision.model.dto.detection.DetectedSignDto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * WebSocket orqali frontend'ga real-time bildirishnoma yuborish servisi.
 *
 * Kanallar:
 *   /topic/detections/{userId}  — foydalanuvchiga shaxsiy bildirishnoma
 *   /topic/detections/all       — barcha foydalanuvchilarga (admin monitor)
 *   /topic/alerts               — faqat kritik belgilar (STOP, DANGER va h.k.)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Aniqlash yakunlanganda foydalanuvchiga bildirishnoma yuboradi.
     * Frontend bu xabarni olganida:
     *   1. Aniqlangan belgilarni ekranda ko'rsatadi
     *   2. has_critical_sign = true bo'lsa ovozli bildirishnoma beradi (Web Speech API)
     */
    public void sendDetectionResult(Long userId, DetectionNotification notification) {
        String destination = "/topic/detections/" + userId;
        try {
            messagingTemplate.convertAndSend(destination, notification);
            log.debug("Bildirishnoma yuborildi -> {} (belgilar: {}, kritik: {})",
                    destination,
                    notification.getTotalSigns(),
                    notification.isHasCriticalSign());
        } catch (Exception e) {
            log.error("Bildirishnoma yuborishda xato [{}]: {}", destination, e.getMessage());
        }
    }

    /**
     * Faqat kritik belgilar uchun tezkor ogohlantirish.
     * Barcha ulangan mijozlarga yuboriladi.
     */
    public void sendCriticalAlert(Long userId, List<DetectedSignDto> criticalSigns) {
        if (criticalSigns == null || criticalSigns.isEmpty()) {
            return;
        }

        DetectionNotification alert = DetectionNotification.builder()
                .userId(userId)
                .detectedSigns(criticalSigns)
                .totalSigns(criticalSigns.size())
                .hasCriticalSign(true)
                .alertMessage(buildAlertMessage(criticalSigns))
                .timestamp(LocalDateTime.now())
                .build();

        // Foydalanuvchiga shaxsiy
        messagingTemplate.convertAndSend("/topic/detections/" + userId, alert);
        // Admin monitoriga ham
        messagingTemplate.convertAndSend("/topic/alerts", alert);

        log.warn("KRITIK BELGI ogohlantirishi yuborildi! Foydalanuvchi: {}, Belgilar: {}",
                userId, criticalSigns.stream().map(DetectedSignDto::getSignType).toList());
    }

    /**
     * Ovozli bildirishnoma matni yaratadi.
     * Frontend Web Speech API orqali buni o'qiydi.
     */
    private String buildAlertMessage(List<DetectedSignDto> signs) {
        if (signs.isEmpty()) return "";

        StringBuilder message = new StringBuilder();
        for (DetectedSignDto sign : signs) {
            String desc = sign.getDescription();
            if (desc != null && !desc.isBlank()) {
                message.append(desc).append(". ");
            } else {
                message.append("Yo'l belgisi: ").append(sign.getSignType()).append(". ");
            }
        }
        return message.toString().trim();
    }
}
