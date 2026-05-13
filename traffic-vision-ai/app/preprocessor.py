import cv2
import numpy as np

from app.config import settings


def validate_file_extension(filename: str) -> bool:
    """Check whether the filename extension is allowed."""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return extension in settings.allowed_extensions_list


def bytes_to_image(file_bytes: bytes) -> np.ndarray:
    """Decode raw image bytes into a BGR OpenCV image."""
    image_array = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Rasm o'qib bo'lmadi, format noto'g'ri")

    return image


def resize_if_needed(image: np.ndarray) -> np.ndarray:
    """Resize image while preserving aspect ratio if it exceeds the configured max size."""
    height, width = image.shape[:2]
    max_size = settings.max_image_size

    if width <= max_size and height <= max_size:
        return image

    scale = min(max_size / width, max_size / height)
    new_width = int(width * scale)
    new_height = int(height * scale)

    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)


def enhance_image(image: np.ndarray) -> np.ndarray:
    """Improve local contrast using CLAHE on the LAB luminance channel."""
    lab_image = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab_image)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_l_channel = clahe.apply(l_channel)

    enhanced_lab = cv2.merge((enhanced_l_channel, a_channel, b_channel))
    return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)


def preprocess(file_bytes: bytes) -> tuple[np.ndarray, tuple[int, int]]:
    """Prepare uploaded image bytes for detection and return processed image plus original size."""
    image = bytes_to_image(file_bytes)
    height, width = image.shape[:2]
    original_size = (width, height)

    resized_image = resize_if_needed(image)
    processed_image = enhance_image(resized_image)

    return processed_image, original_size
