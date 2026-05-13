package uz.pdp.trafficvision.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import uz.pdp.trafficvision.model.dto.stats.DetectionStatsDto;
import uz.pdp.trafficvision.model.enums.DetectionStatus;
import uz.pdp.trafficvision.repository.DetectedSignRepository;
import uz.pdp.trafficvision.repository.DetectionRepository;

/**
 * Foydalanuvchi statistikasi servisi.
 * Nechta aniqlash, qanday belgilar ko'proq uchraydi va h.k.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StatsService {

    private final DetectionRepository detectionRepository;
    private final DetectedSignRepository detectedSignRepository;

    /**
     * Foydalanuvchi uchun umumiy statistika.
     */
    public DetectionStatsDto getStatsForUser(Long userId) {
        long totalDetections = detectionRepository.countByUserId(userId);
        long completedDetections = detectionRepository
                .findByUserIdAndStatus(userId, DetectionStatus.COMPLETED)
                .size();
        long failedDetections = detectionRepository
                .findByUserIdAndStatus(userId, DetectionStatus.FAILED)
                .size();
        long totalSignsFound = detectedSignRepository.countByDetectionUserId(userId);

        return DetectionStatsDto.builder()
                .totalDetections(totalDetections)
                .completedDetections(completedDetections)
                .failedDetections(failedDetections)
                .totalSignsFound(totalSignsFound)
                .build();
    }
}
