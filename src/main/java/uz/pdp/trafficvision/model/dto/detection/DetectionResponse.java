package uz.pdp.trafficvision.model.dto.detection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetectionResponse {

    private Long id;

    private String status;

    private String imageUrl;

    private List<DetectedSignDto> detectedSigns;

    private Long processingTimeMs;

    private LocalDateTime createdAt;

    public Integer getTotalSigns() {
        return detectedSigns == null ? 0 : detectedSigns.size();
    }
}
