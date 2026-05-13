package uz.pdp.trafficvision.model.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import uz.pdp.trafficvision.model.dto.detection.DetectedSignDto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * WebSocket orqali frontend'ga yuboriladigan real-time bildirishnoma.
 *
 * Frontend bu xabarni olganida:
 *   1. detectedSigns ni ekranda ko'rsatadi (bounding box va sign nomi)
 *   2. hasCriticalSign = true bo'lsa: Web Speech API bilan alertMessage ni o'qiydi
 *   3. audioText ni ovozli bildirishnoma uchun ishlatadi
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetectionNotification {

    /** Qaysi foydalanuvchiga tegishli */
    private Long userId;

    /** Aniqlangan barcha belgilar */
    private List<DetectedSignDto> detectedSigns;

    /** Jami belgilar soni */
    private int totalSigns;

    /** Kritik belgi bormi? (STOP, XAVF va h.k.) */
    private boolean hasCriticalSign;

    /**
     * Ovozli bildirishnoma matni (o'zbek tilida).
     * Frontend Web Speech API orqali buni o'qiydi.
     * Misol: "To'xtang! STOP belgisi aniqlandi. Diqqat! Piyodalar o'tish joyi."
     */
    private String alertMessage;

    /** Aniqlash ID (tarixga bog'lash uchun) */
    private Long detectionId;

    /** Rasm URL */
    private String imageUrl;

    /** Qayta ishlash vaqti (ms) */
    private Long processingTimeMs;

    /** Qachon aniqlangan */
    private LocalDateTime timestamp;
}
