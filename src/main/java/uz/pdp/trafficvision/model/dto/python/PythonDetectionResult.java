package uz.pdp.trafficvision.model.dto.python;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PythonDetectionResult {

    @JsonProperty("sign_type")
    private String signType;

    private Double confidence;

    private Integer x;

    private Integer y;

    private Integer width;

    private Integer height;
}
