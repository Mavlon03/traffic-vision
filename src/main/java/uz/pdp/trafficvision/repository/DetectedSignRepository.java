package uz.pdp.trafficvision.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import uz.pdp.trafficvision.model.entity.DetectedSign;

import java.util.List;

public interface DetectedSignRepository extends JpaRepository<DetectedSign, Long> {

    List<DetectedSign> findByDetectionId(Long detectionId);

    @Query("""
            SELECT ds.signType, COUNT(ds) FROM DetectedSign ds
            WHERE ds.detection.user.id = :userId
            GROUP BY ds.signType
            ORDER BY COUNT(ds) DESC
            """)
    List<Object[]> findTopSignsByUserId(@Param("userId") Long userId);
}
