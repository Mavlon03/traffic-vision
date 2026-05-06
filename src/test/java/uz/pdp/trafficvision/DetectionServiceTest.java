package uz.pdp.trafficvision;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;
import uz.pdp.trafficvision.exception.FileStorageException;
import uz.pdp.trafficvision.model.dto.detection.DetectionResponse;
import uz.pdp.trafficvision.model.dto.python.PythonDetectionResult;
import uz.pdp.trafficvision.model.entity.DetectedSign;
import uz.pdp.trafficvision.model.entity.Detection;
import uz.pdp.trafficvision.model.entity.Image;
import uz.pdp.trafficvision.model.entity.User;
import uz.pdp.trafficvision.model.enums.DetectionStatus;
import uz.pdp.trafficvision.repository.DetectedSignRepository;
import uz.pdp.trafficvision.repository.DetectionRepository;
import uz.pdp.trafficvision.repository.ImageRepository;
import uz.pdp.trafficvision.service.DetectionService;
import uz.pdp.trafficvision.service.ImageService;
import uz.pdp.trafficvision.service.PythonClientService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class DetectionServiceTest {

    @Mock
    private ImageService imageService;

    @Mock
    private PythonClientService pythonClientService;

    @Mock
    private DetectionRepository detectionRepository;

    @Mock
    private DetectedSignRepository detectedSignRepository;

    @Mock
    private ImageRepository imageRepository;

    @Mock
    private MultipartFile file;

    @InjectMocks
    private DetectionService detectionService;

    @Test
    void detect_success() {
        User user = User.builder().id(1L).email("user@test.com").build();
        Image image = Image.builder().id(10L).user(user).filePath("uploads/image.jpg").build();
        List<PythonDetectionResult> pythonResults = List.of(
                PythonDetectionResult.builder().signType("stop").confidence(0.95).x(1).y(2).width(30).height(40).build(),
                PythonDetectionResult.builder().signType("speed_50").confidence(0.90).x(5).y(6).width(50).height(60).build()
        );

        when(imageService.saveImage(file, user)).thenReturn(image);
        when(detectionRepository.save(any(Detection.class))).thenAnswer(invocation -> {
            Detection detection = invocation.getArgument(0);
            if (detection.getId() == null) {
                detection.setId(100L);
            }
            return detection;
        });
        when(pythonClientService.detect(file)).thenReturn(pythonResults);
        when(detectedSignRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(detectedSignRepository.findByDetectionId(100L)).thenReturn(List.of(
                DetectedSign.builder().id(1L).signType("stop").confidence(0.95).x(1).y(2).width(30).height(40).build(),
                DetectedSign.builder().id(2L).signType("speed_50").confidence(0.90).x(5).y(6).width(50).height(60).build()
        ));
        when(imageService.getImageUrl("uploads/image.jpg")).thenReturn("/api/images/image.jpg");

        DetectionResponse response = detectionService.detect(file, user);

        ArgumentCaptor<Detection> detectionCaptor = ArgumentCaptor.forClass(Detection.class);
        verify(detectionRepository, org.mockito.Mockito.atLeastOnce()).save(detectionCaptor.capture());

        assertThat(detectionCaptor.getAllValues()).extracting(Detection::getStatus)
                .contains(DetectionStatus.COMPLETED);
        assertThat(response.getStatus()).isEqualTo("COMPLETED");
        assertThat(response.getTotalSigns()).isEqualTo(2);
        assertThat(response.getProcessingTimeMs()).isNotNull();
    }

    @Test
    void detect_pythonFails() {
        User user = User.builder().id(1L).email("user@test.com").build();
        Image image = Image.builder().id(10L).user(user).filePath("uploads/image.jpg").build();

        when(imageService.saveImage(file, user)).thenReturn(image);
        when(detectionRepository.save(any(Detection.class))).thenAnswer(invocation -> {
            Detection detection = invocation.getArgument(0);
            if (detection.getId() == null) {
                detection.setId(100L);
            }
            return detection;
        });
        when(pythonClientService.detect(file)).thenThrow(new FileStorageException("Python failed"));

        assertThatThrownBy(() -> detectionService.detect(file, user))
                .isInstanceOf(FileStorageException.class)
                .hasMessage("Python failed");

        ArgumentCaptor<Detection> detectionCaptor = ArgumentCaptor.forClass(Detection.class);
        verify(detectionRepository, org.mockito.Mockito.atLeastOnce()).save(detectionCaptor.capture());

        assertThat(detectionCaptor.getAllValues().get(detectionCaptor.getAllValues().size() - 1).getStatus())
                .isEqualTo(DetectionStatus.FAILED);
    }
}
