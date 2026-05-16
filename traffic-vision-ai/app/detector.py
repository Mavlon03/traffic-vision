import logging
from pathlib import Path
from time import perf_counter

import cv2
import numpy as np
from ultralytics import YOLO

from app.config import settings
from app.model_registry import ModelRegistry
from app.preprocessor import preprocess
from app.schemas import DetectedSign, VideoFrameResponse

logger = logging.getLogger(__name__)

SIGN_DESCRIPTIONS: dict[str, str] = {
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
    "give_way": "Yo'l bering",
    "priority_road": "Ustunlik yo'li",
    "turn_left": "Chap tomonga buring",
    "turn_right": "O'ng tomonga buring",
    "go_straight": "To'g'ri boring",
    "parking": "To'xtash joyi",
    "hospital": "Kasalxona yaqinda",
    "fuel_station": "Yoqilg'i quyish stantsiyasi",
}

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
    key = sign_type.lower().replace(" ", "_").replace("-", "_")
    return SIGN_DESCRIPTIONS.get(key, f"Yo'l belgisi aniqlandi: {sign_type}")


class TrafficSignDetector:
    def __init__(self) -> None:
        self.model_cache: dict[str, YOLO] = {}
        self.registry = ModelRegistry(
            models_dir=settings.models_dir,
            registry_file=settings.model_registry_path,
            default_model_path=settings.model_path,
        )
        self.is_loaded = False

    def load_model(self) -> None:
        self.registry.ensure_initialized()
        primary = self.registry.get_primary_model()
        self._load_model_from_path(primary["path"])
        self.is_loaded = True
        logger.info("Primary model ready: %s", primary["name"])

    def detect(self, file_bytes: bytes) -> tuple[list[DetectedSign], float, tuple[int, int], str, str]:
        if not self.is_loaded:
            raise RuntimeError("Model yuklanmagan")

        start_time = perf_counter()
        processed_image, original_size = preprocess(file_bytes)
        signs, matched_model, matched_by = self._detect_with_fallback(processed_image)
        processing_time = (perf_counter() - start_time) * 1000
        return signs, processing_time, original_size, matched_model, matched_by

    def detect_frame(self, frame: np.ndarray, frame_id: int = 0) -> VideoFrameResponse:
        if not self.is_loaded:
            raise RuntimeError("Model yuklanmagan")

        start_time = perf_counter()
        signs, _, _ = self._detect_with_fallback(frame)
        processing_time = (perf_counter() - start_time) * 1000

        critical_types = [
            s.sign_type for s in signs if s.sign_type.lower().replace(" ", "_") in CRITICAL_SIGNS
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
        img_array = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Frame o'qib bo'lmadi")
        return self.detect_frame(frame, frame_id)

    def list_models(self) -> dict:
        self.registry.ensure_initialized()
        return self.registry.list_models()

    def get_current_model(self) -> dict:
        self.registry.ensure_initialized()
        return self.registry.get_primary_model()

    def add_model(self, filename: str) -> dict:
        self.registry.ensure_initialized()
        return self.registry.add_model(filename)

    def validate_model(self, model_path: str) -> None:
        self._load_model_from_path(model_path)

    def update_model(self, name: str, set_as_primary: bool | None, use_as_fallback: bool | None) -> dict:
        self.registry.ensure_initialized()
        updated = self.registry.update_model(name, set_as_primary, use_as_fallback)
        if updated["is_primary"]:
            self._load_model_from_path(updated["path"])
        return updated

    def delete_model(self, name: str) -> None:
        self.registry.ensure_initialized()
        model = self.registry.get_model(name)
        self.registry.delete_model(name)
        if model is not None:
            self.model_cache.pop(model["path"], None)

    def is_ready(self) -> bool:
        return self.is_loaded

    def _detect_with_fallback(self, source: np.ndarray) -> tuple[list[DetectedSign], str, str]:
        candidates = self.registry.detection_order()
        primary_name = candidates[0]["name"]

        for index, model_meta in enumerate(candidates):
            results = self._predict_with_model(source, model_meta["path"])
            signs = self._parse_results(results)
            if signs:
                matched_by = "primary" if index == 0 else "fallback"
                return signs, model_meta["name"], matched_by

        return [], primary_name, "primary"

    def _predict_with_model(self, source: np.ndarray, model_path: str):
        model = self._load_model_from_path(model_path)
        return model.predict(
            source=source,
            conf=settings.confidence_threshold,
            iou=settings.iou_threshold,
            verbose=False,
        )

    def _load_model_from_path(self, model_path: str) -> YOLO:
        normalized = model_path.replace("\\", "/")
        cached = self.model_cache.get(normalized)
        if cached is not None:
            return cached

        resolved_path = Path(model_path)
        if not resolved_path.is_absolute():
            resolved_path = Path(model_path)

        model = YOLO(str(resolved_path))
        self.model_cache[normalized] = model
        logger.info("YOLO model loaded from %s", resolved_path)
        return model

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


detector = TrafficSignDetector()
