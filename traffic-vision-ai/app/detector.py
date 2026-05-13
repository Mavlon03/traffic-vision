import logging
from time import perf_counter

import cv2
import numpy as np
from ultralytics import YOLO

from app.config import settings
from app.preprocessor import preprocess
from app.schemas import DetectedSign, VideoFrameResponse

logger = logging.getLogger(__name__)

# Yo'l belgilarining o'zbek tilidagi tavsifi (ovozli bildirishnoma uchun)
SIGN_DESCRIPTIONS: dict[str, str] = {
    # Taqiqlovchi belgilar
    "stop": "To'xtang! STOP belgisi aniqlandi",
    "no_entry": "Kirish taqiqlangan",
    "no_overtaking": "Quvib o'tish taqiqlangan",
    "speed_limit_30": "Tezlik cheklovi: 30 km/soat",
    "speed_limit_50": "Tezlik cheklovi: 50 km/soat",
    "speed_limit_60": "Tezlik cheklovi: 60 km/soat",
    "speed_limit_70": "Tezlik cheklovi: 70 km/soat",
    "speed_limit_80": "Tezlik cheklovi: 80 km/soat",
    "speed_limit_100": "Tezlik cheklovi: 100 km/soat",
    "speed_limit_120": "Tezlik cheklovi: 120 km/soat",
    "no_parking": "To'xtatish taqiqlangan",
    "no_stopping": "To'xtab turish taqiqlangan",
    # Ogohlantiruvchi belgilar
    "danger": "Diqqat! Xavf bor",
    "crossroads": "Kesishma yaqinlashmoqda",
    "pedestrian_crossing": "Piyodalar o'tish joyi",
    "children": "Diqqat! Bolalar",
    "railway_crossing": "Temir yo'l kesishmasi",
    "traffic_signals": "Svetofor yaqinlashmoqda",
    "roundabout": "Aylanma harakat",
    "slippery_road": "Diqqat! Sirpanma yo'l",
    "road_works": "Yo'l ta'miri ishlari",
    "sharp_turn_left": "Keskin burilish chap tomonga",
    "sharp_turn_right": "Keskin burilish o'ng tomonga",
    # Buyuruvchi belgilar
    "give_way": "Yo'l bering",
    "priority_road": "Ustunlik yo'li",
    "turn_left": "Chap tomonga buring",
    "turn_right": "O'ng tomonga buring",
    "go_straight": "To'g'ri boring",
    # Axborot belgilari
    "parking": "To'xtash joyi",
    "hospital": "Kasalxona yaqinda",
    "fuel_station": "Yoqilg'i quyish stantsiyasi",
}

# Tezkor ogohlantirish talab etuvchi kritik belgilar
CRITICAL_SIGNS: set[str] = {
    "stop",
    "no_entry",
    "danger",
    "railway_crossing",
    "pedestrian_crossing",
    "children",
    "give_way",
    "traffic_signals",
}


def get_sign_description(sign_type: str) -> str:
    """Sign uchun o'zbek tilidagi tavsif qaytaradi."""
    key = sign_type.lower().replace(" ", "_").replace("-", "_")
    return SIGN_DESCRIPTIONS.get(key, f"Yo'l belgisi aniqlandi: {sign_type}")


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

        signs = self._parse_results(results)
        processing_time = (perf_counter() - start_time) * 1000
        return signs, processing_time, original_size

    def detect_frame(self, frame: np.ndarray, frame_id: int = 0) -> VideoFrameResponse:
        """Video frame'ni real-time aniqlash (WebSocket uchun)."""
        if not self.is_loaded:
            raise RuntimeError("Model yuklanmagan")

        start_time = perf_counter()

        results = self.model.predict(
            source=frame,
            conf=settings.confidence_threshold,
            iou=settings.iou_threshold,
            verbose=False,
        )

        signs = self._parse_results(results)
        processing_time = (perf_counter() - start_time) * 1000

        critical_types = [
            s.sign_type for s in signs
            if s.sign_type.lower().replace(" ", "_") in CRITICAL_SIGNS
        ]

        return VideoFrameResponse(
            signs=signs,
            total_signs=len(signs),
            processing_time_ms=round(processing_time, 2),
            frame_id=frame_id,
            has_critical_sign=len(critical_types) > 0,
            critical_sign_types=critical_types,
        )

    def detect_from_base64_frame(self, frame_bytes: bytes, frame_id: int = 0) -> VideoFrameResponse:
        """Base64 decoded frame baytlaridan aniqlash."""
        img_array = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Frame o'qib bo'lmadi")
        return self.detect_frame(frame, frame_id)

    def _parse_results(self, results) -> list[DetectedSign]:
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
                        description=get_sign_description(sign_type),
                    )
                )
        return signs

    def is_ready(self) -> bool:
        return self.is_loaded


detector = TrafficSignDetector()
