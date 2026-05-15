package uz.pdp.trafficvision.controller;

import jakarta.annotation.security.PermitAll;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import uz.pdp.trafficvision.model.dto.detection.DetectedSignDto;
import uz.pdp.trafficvision.model.dto.detection.DetectionResponse;
import uz.pdp.trafficvision.model.dto.detection.VideoFrameResponse;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResponse;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResult;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.service.DetectionService;
import uz.pdp.trafficvision.service.PythonClientService;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/detect")
@RequiredArgsConstructor
public class DetectionController {

    private static final Set<String> CRITICAL_SIGN_TYPES = Set.of(
            "stop", "stop_sign", "stop sign", "no_entry", "no entry", "yield", "give_way", "give way"
    );

    private final DetectionService detectionService;
    private final PythonClientService pythonClientService;

    @PostMapping(value = "/", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<DetectionResponse> detect(@RequestParam("file") MultipartFile file) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(detectionService.detect(file, currentUser));
    }

    @PostMapping(value = "/frame", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PermitAll
    public ResponseEntity<VideoFrameResponse> detectFrame(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "frame_id", defaultValue = "") String frameId
    ) {
        PythonDetectionResponse pythonResponse = pythonClientService.detect(file);
        List<DetectedSignDto> signs = pythonResponse.getSigns().stream()
                .map(this::mapToDto)
                .toList();
        List<String> criticalSignTypes = signs.stream()
                .map(DetectedSignDto::getSignType)
                .filter(this::isCriticalSign)
                .distinct()
                .toList();

        VideoFrameResponse response = VideoFrameResponse.builder()
                .frameId(frameId)
                .signs(signs)
                .totalSigns(signs.size())
                .hasCriticalSign(!criticalSignTypes.isEmpty())
                .criticalSignTypes(criticalSignTypes)
                .processingTimeMs(pythonResponse.getProcessingTimeMs())
                .modelVersion(pythonResponse.getModelVersion())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<DetectionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(detectionService.getById(id));
    }

    private boolean isCriticalSign(String signType) {
        if (signType == null) {
            return false;
        }
        String normalized = signType.trim().toLowerCase().replace('-', ' ').replace('_', ' ');
        return CRITICAL_SIGN_TYPES.contains(normalized) || CRITICAL_SIGN_TYPES.contains(normalized.replace(' ', '_'));
    }

    private DetectedSignDto mapToDto(PythonDetectionResult sign) {
        return DetectedSignDto.builder()
                .signType(sign.getSignType())
                .confidence(sign.getConfidence())
                .x(sign.getX())
                .y(sign.getY())
                .width(sign.getWidth())
                .height(sign.getHeight())
                .description(sign.getDescription())
                .build();
    }
}
