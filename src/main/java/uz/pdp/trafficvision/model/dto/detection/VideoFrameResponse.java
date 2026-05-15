package uz.pdp.trafficvision.model.dto.detection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoFrameResponse {

    private String frameId;

    private List<DetectedSignDto> signs;

    private int totalSigns;

    private boolean hasCriticalSign;

    private List<String> criticalSignTypes;

    private double processingTimeMs;

    private String modelVersion;
}
