import logging
from time import perf_counter

from ultralytics import YOLO

from app.config import settings
from app.preprocessor import preprocess
from app.schemas import DetectedSign

logger = logging.getLogger(__name__)


class TrafficSignDetector:
    def __init__(self) -> None:
        self.model = None
        self.model_path = settings.model_path
        self.is_loaded = False

    def load_model(self) -> None:
        if self.is_loaded and self.model is not None:
            return

        try:
            self.model = YOLO(self.model_path)
            self.is_loaded = True
            logger.info("YOLO model loaded from %s", self.model_path)
        except Exception:
            logger.exception("Failed to load YOLO model from %s", self.model_path)
            raise

    def detect(self, file_bytes: bytes) -> tuple[list[DetectedSign], float, tuple[int, int]]:
        if not self.is_loaded:
            raise RuntimeError("Model yuklanmagan")

        start_time = perf_counter()
        processed_image, original_size = preprocess(file_bytes)

        results = self.model.predict(
            source=processed_image,
            conf=settings.confidence_threshold,
            iou=settings.iou_threshold,
            verbose=False,
        )

        signs: list[DetectedSign] = []
        for result in results:
            for box in result.boxes:
                class_id = int(box.cls[0])
                sign_type = result.names[class_id]
                confidence = float(box.conf[0])
                x, y, width, height = box.xywh[0].tolist()

                top_left_x = int(x - width / 2)
                top_left_y = int(y - height / 2)
                box_width = max(1, int(round(width)))
                box_height = max(1, int(round(height)))

                signs.append(
                    DetectedSign(
                        sign_type=sign_type,
                        confidence=round(confidence, 4),
                        x=max(0, top_left_x),
                        y=max(0, top_left_y),
                        width=box_width,
                        height=box_height,
                    )
                )

        processing_time = (perf_counter() - start_time) * 1000
        return signs, processing_time, original_size

    def is_ready(self) -> bool:
        return self.is_loaded


detector = TrafficSignDetector()
