package uz.pdp.trafficvision.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.pdp.trafficvision.model.dto.detection.DetectionResponse;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.service.DetectionService;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final DetectionService detectionService;

    @GetMapping
    public ResponseEntity<Page<DetectionResponse>> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(detectionService.getHistory(currentUser.getId(), PageRequest.of(page, size)));
    }
}
