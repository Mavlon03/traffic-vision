package uz.pdp.trafficvision.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import uz.pdp.trafficvision.model.entity.Image;

import java.util.List;

public interface ImageRepository extends JpaRepository<Image, Long> {

    List<Image> findByUserIdOrderByUploadedAtDesc(Long userId);
}
