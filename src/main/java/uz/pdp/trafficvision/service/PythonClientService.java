package uz.pdp.trafficvision.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import uz.pdp.trafficvision.exception.FileStorageException;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResult;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PythonClientService {

    private final RestTemplate restTemplate;

    @Value("${python.api.url}")
    private String pythonApiUrl;

    public List<PythonDetectionResult> detect(MultipartFile file) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", createFileResource(file));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    pythonApiUrl + "/detect",
                    HttpMethod.POST,
                    requestEntity,
                    new ParameterizedTypeReference<>() {
                    }
            );

            List<Map<String, Object>> results = response.getBody();
            if (results == null) {
                return List.of();
            }

            return results.stream()
                    .map(this::mapToPythonDetectionResult)
                    .toList();
        } catch (IOException | RestClientException exception) {
            throw new FileStorageException("Could not process image with Python detection service");
        }
    }

    private ByteArrayResource createFileResource(MultipartFile file) throws IOException {
        return new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename();
            }
        };
    }

    private PythonDetectionResult mapToPythonDetectionResult(Map<String, Object> map) {
        return PythonDetectionResult.builder()
                .signType((String) map.get("sign_type"))
                .confidence(toDouble(map.get("confidence")))
                .x(toInteger(map.get("x")))
                .y(toInteger(map.get("y")))
                .width(toInteger(map.get("width")))
                .height(toInteger(map.get("height")))
                .build();
    }

    private Double toDouble(Object value) {
        return value == null ? null : ((Number) value).doubleValue();
    }

    private Integer toInteger(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }
}
