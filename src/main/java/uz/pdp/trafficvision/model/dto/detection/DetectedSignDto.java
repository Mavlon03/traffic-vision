package uz.pdp.trafficvision.model.dto.detection;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetectedSignDto {

    private Long id;

    private String signType;

    private Double confidence;

    private Integer x;

    private Integer y;

    private Integer width;

    private Integer height;
}
