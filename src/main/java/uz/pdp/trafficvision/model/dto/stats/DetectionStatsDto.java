package uz.pdp.trafficvision.model.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Foydalanuvchi aniqlash statistikasi.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetectionStatsDto {

    /** Jami aniqlash urinishlari */
    private long totalDetections;

    /** Muvaffaqiyatli yakunlangan */
    private long completedDetections;

    /** Xato bilan yakunlangan */
    private long failedDetections;

    /** Jami topilgan yo'l belgilari */
    private long totalSignsFound;
}
