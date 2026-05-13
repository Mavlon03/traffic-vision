from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import DetectedSign


@pytest.fixture()
def client():
    with patch("app.main.detector.load_model"), patch("app.main.detector.is_ready", return_value=True):
        with TestClient(app) as test_client:
            yield test_client


def test_health_endpoint(client: TestClient):
    with patch("app.main.detector") as mock_det:
        mock_det.is_ready.return_value = True
        response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True


def test_detect_no_file_returns_422(client: TestClient):
    response = client.post("/detect")

    assert response.status_code == 422


def test_detect_invalid_extension_returns_415(client: TestClient):
    with patch("app.main.detector") as mock_det:
        mock_det.is_ready.return_value = True
        response = client.post(
            "/detect",
            files={"file": ("test.pdf", b"fake", "application/pdf")},
        )

    assert response.status_code == 415


def test_detect_empty_file_returns_400(client: TestClient):
    with patch("app.main.detector") as mock_det:
        mock_det.is_ready.return_value = True
        response = client.post(
            "/detect",
            files={"file": ("test.jpg", b"", "image/jpeg")},
        )

    assert response.status_code == 400


def test_detect_success_returns_detection_response(client: TestClient):
    fake_sign = DetectedSign(
        sign_type="stop",
        confidence=0.97,
        x=70,
        y=50,
        width=60,
        height=60,
    )

    with patch("app.main.detector") as mock_det:
        mock_det.is_ready.return_value = True
        mock_det.detect.return_value = ([fake_sign], 45.3, (640, 480))
        response = client.post(
            "/detect",
            files={"file": ("road.jpg", b"fake-image-bytes", "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["total_signs"] == 1
    assert data["signs"][0]["sign_type"] == "stop"
    assert data["signs"][0]["confidence"] == 0.97
    assert data["processing_time_ms"] == 45.3
    assert data["model_version"] == "yolov8n"
    assert data["image_size"] == [640, 480]


def test_detect_model_not_ready_returns_503(client: TestClient):
    with patch("app.main.detector") as mock_det:
        mock_det.is_ready.return_value = False
        response = client.post(
            "/detect",
            files={"file": ("road.jpg", b"fake", "image/jpeg")},
        )

    assert response.status_code == 503
