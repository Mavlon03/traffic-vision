package uz.pdp.trafficvision.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.pdp.trafficvision.model.entity.Detection;
import uz.pdp.trafficvision.model.enums.DetectionStatus;

import java.util.List;

public interface DetectionRepository extends JpaRepository<Detection, Long> {

    Page<Detection> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Detection> findByUserIdAndStatus(Long userId, DetectionStatus status);

    @Query("SELECT COUNT(d) FROM Detection d WHERE d.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);
}
