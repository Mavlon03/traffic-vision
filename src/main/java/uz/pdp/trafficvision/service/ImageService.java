package uz.pdp.trafficvision.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import uz.pdp.trafficvision.exception.FileStorageException;
import uz.pdp.trafficvision.exception.ResourceNotFoundException;
import uz.pdp.trafficvision.model.entity.Image;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.repository.ImageRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ImageService {

    private final ImageRepository imageRepository;

    @Value("${file.upload.dir}")
    private String uploadDir;

    public Image saveImage(MultipartFile file, User user) {
        try {
            Path uploadPath = Path.of(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(uploadPath);

            String fileName = UUID.randomUUID() + getExtension(file.getOriginalFilename());
            Path targetPath = uploadPath.resolve(fileName).normalize();
            Files.copy(file.getInputStream(), targetPath);

            Image image = Image.builder()
                    .user(user)
                    .fileName(fileName)
                    .filePath(targetPath.toString())
                    .fileSize(file.getSize())
                    .contentType(file.getContentType())
                    .build();

            return imageRepository.save(image);
        } catch (IOException exception) {
            throw new FileStorageException("Could not store image file");
        }
    }

    public String getImageUrl(String filePath) {
        return "/api/images/" + Path.of(filePath).getFileName();
    }

    public void deleteImage(Long imageId) {
        Image image = imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + imageId));

        try {
            Files.deleteIfExists(Path.of(image.getFilePath()));
            imageRepository.delete(image);
        } catch (IOException exception) {
            throw new FileStorageException("Could not delete image file");
        }
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "";
        }
        return originalFilename.substring(originalFilename.lastIndexOf("."));
    }
}
