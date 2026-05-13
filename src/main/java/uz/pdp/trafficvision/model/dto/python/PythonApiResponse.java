package uz.pdp.trafficvision.model.dto.python;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Python FastAPI /detect endpointidan keladigan javob.
 * Python response formati:
 * {
 *   "signs": [ { "sign_type": "...", "confidence": 0.9, "x":10, "y":10,
 *                "width":50, "height":50, "description": "..." } ],
 *   "total_signs": 2,
 *   "processing_time_ms": 45.3,
 *   "model_version": "yolov8n",
 *   "image_size": [640, 480]
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonApiResponse {

    private List<PythonDetectionResult> signs;

    @JsonProperty("total_signs")
    private Integer totalSigns;

    @JsonProperty("processing_time_ms")
    private Double processingTimeMs;

    @JsonProperty("model_version")
    private String modelVersion;

    @JsonProperty("image_size")
    private List<Integer> imageSize;
}
