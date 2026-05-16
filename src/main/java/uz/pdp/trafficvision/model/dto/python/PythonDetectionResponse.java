package uz.pdp.trafficvision.model.dto.python;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class PythonDetectionResponse {

    private List<PythonDetectionResult> signs;

    private double processingTimeMs;

    private String modelVersion;

    private List<Integer> imageSize;
}
