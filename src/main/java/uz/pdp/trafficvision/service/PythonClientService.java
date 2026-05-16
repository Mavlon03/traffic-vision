package uz.pdp.trafficvision.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import uz.pdp.trafficvision.exception.FileStorageException;
import uz.pdp.trafficvision.model.dto.python.PythonApiResponse;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResponse;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResult;

import java.io.IOException;
import java.util.List;

/**
 * Python FastAPI AI servisiga so'rov yuboruvchi mijoz.
 *
 * Python /detect endpointi quyidagi formatda javob qaytaradi:
 * {
 *   "signs": [...],
 *   "total_signs": N,
 *   "processing_time_ms": 45.3,
 *   "model_version": "yolov8n",
 *   "image_size": [640, 480]
 * }
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PythonClientService {

    private final RestTemplate restTemplate;

    @Value("${python.api.url}")
    private String pythonApiUrl;

    /**
     * Rasmni Python AI servisiga yuboradi va aniqlangan belgilar ro'yxatini qaytaradi.
     *
     * @param file yuklangan rasm yoki video frame
     * @return aniqlangan yo'l belgilari ro'yxati (description bilan)
     * @throws FileStorageException Python servisi bilan bog'lanishda xato bo'lsa
     */
    public PythonDetectionResponse detect(MultipartFile file) {
        try {
            HttpEntity<MultiValueMap<String, Object>> requestEntity = buildMultipartRequest(file);

            ResponseEntity<PythonApiResponse> response = restTemplate.exchange(
                    pythonApiUrl + "/detect",
                    HttpMethod.POST,
                    requestEntity,
                    PythonApiResponse.class
            );

            PythonApiResponse body = response.getBody();
            if (body == null || body.getSigns() == null) {
                log.warn("Python servisi bo'sh javob qaytardi");
                return new PythonDetectionResponse(List.of(), 0D, "yolov8n", null);
            }

            log.debug("Python aniqladi: {} ta belgi, {} ms",
                    body.getTotalSigns(), body.getProcessingTimeMs());
            return new PythonDetectionResponse(
                    body.getSigns(),
                    body.getProcessingTimeMs() != null ? body.getProcessingTimeMs() : 0D,
                    body.getModelVersion() != null ? body.getModelVersion() : "yolov8n",
                    body.getImageSize()
            );

        } catch (IOException e) {
            log.error("Fayl o'qishda xato: {}", e.getMessage());
            throw new FileStorageException("Fayl o'qib bo'lmadi: " + e.getMessage());
        } catch (RestClientException e) {
            log.error("Python AI servisi bilan bog'lanishda xato: {}", e.getMessage());
            throw new FileStorageException("AI servisi bilan bog'lanib bo'lmadi. Python server ishga tushganmi?");
        }
    }

    /**
     * Python AI servisining holatini tekshiradi.
     *
     * @return true — server ishlayapti va model yuklangan
     */
    public boolean isAiServiceHealthy() {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                    pythonApiUrl + "/health",
                    String.class
            );
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("Python AI health check muvaffaqiyatsiz: {}", e.getMessage());
            return false;
        }
    }

    private HttpEntity<MultiValueMap<String, Object>> buildMultipartRequest(MultipartFile file) throws IOException {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", createFileResource(file));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        return new HttpEntity<>(body, headers);
    }

    private ByteArrayResource createFileResource(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        String filename = file.getOriginalFilename() != null
                ? file.getOriginalFilename()
                : "frame.jpg";

        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }
}
