from unittest.mock import MagicMock, patch

import pytest

from app.detector import TrafficSignDetector


def test_detector_not_loaded_raises():
    detector = TrafficSignDetector()

    with pytest.raises(RuntimeError, match="Model yuklanmagan"):
        detector.detect(b"fake-bytes")


def test_load_model_sets_is_loaded():
    detector = TrafficSignDetector()

    with patch("app.detector.YOLO") as mock_yolo:
        mock_yolo.return_value = MagicMock()
        detector.load_model()

    assert detector.is_loaded is True
    assert detector.is_ready() is True


def test_detect_returns_correct_structure():
    detector = TrafficSignDetector()

    mock_box = MagicMock()
    mock_box.cls = [0]
    mock_box.conf = [0.97]
    mock_box.xywh = [MagicMock()]
    mock_box.xywh[0].tolist.return_value = [100.0, 80.0, 60.0, 60.0]

    mock_result = MagicMock()
    mock_result.boxes = [mock_box]
    mock_result.names = {0: "stop"}

    with patch("app.detector.YOLO") as mock_yolo:
        mock_yolo.return_value = MagicMock()
        mock_yolo.return_value.predict.return_value = [mock_result]
        detector.load_model()
        detector.model = mock_yolo.return_value

    with patch("app.detector.preprocess") as mock_pre:
        mock_pre.return_value = (MagicMock(), (640, 480))
        signs, proc_time, img_size = detector.detect(b"fake")

    assert len(signs) == 1
    assert signs[0].sign_type == "stop"
    assert signs[0].confidence == 0.97
    assert signs[0].x == 70
    assert signs[0].y == 50
    assert signs[0].width == 60
    assert signs[0].height == 60
    assert proc_time > 0
    assert img_size == (640, 480)
