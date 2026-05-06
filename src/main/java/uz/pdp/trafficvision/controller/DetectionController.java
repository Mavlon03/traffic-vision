package uz.pdp.trafficvision.controller;

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
import uz.pdp.trafficvision.model.dto.detection.DetectionResponse;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.service.DetectionService;

@RestController
@RequestMapping("/api/detect")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public class DetectionController {

    private final DetectionService detectionService;

    @PostMapping(value = "/", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DetectionResponse> detect(@RequestParam("file") MultipartFile file) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(detectionService.detect(file, currentUser));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DetectionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(detectionService.getById(id));
    }
}
