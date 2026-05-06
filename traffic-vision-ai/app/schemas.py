from pydantic import BaseModel, Field


class DetectedSign(BaseModel):
    sign_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class DetectionResponse(BaseModel):
    signs: list[DetectedSign]
    total_signs: int
    processing_time_ms: float
    model_version: str = "yolov8n"
    image_size: tuple[int, int]


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_path: str
    version: str = "1.0.0"
