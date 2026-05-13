package uz.pdp.trafficvision.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import uz.pdp.trafficvision.model.dto.stats.DetectionStatsDto;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.service.StatsService;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public class StatsController {

    private final StatsService statsService;

    /**
     * GET /api/stats
     * Joriy foydalanuvchining statistikasi.
     */
    @GetMapping
    public ResponseEntity<DetectionStatsDto> getMyStats() {
        User currentUser = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(statsService.getStatsForUser(currentUser.getId()));
    }
}
