from pydantic import BaseModel, Field


class DetectedSign(BaseModel):
    sign_type: str
    confidence: float = Field(ge=0.0, le=1.0)
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    description: str = ""  # ovozli bildirishnoma uchun


class DetectionResponse(BaseModel):
    signs: list[DetectedSign]
    total_signs: int
    processing_time_ms: float
    model_version: str = "yolov8n"
    image_size: tuple[int, int]
    matched_by: str = "primary"


class VideoFrameResponse(BaseModel):
    """Real-time video frame detection natijasi"""
    signs: list[DetectedSign]
    total_signs: int
    processing_time_ms: float
    frame_id: int = 0
    has_critical_sign: bool = False  # bildirishnoma kerakmi?
    critical_sign_types: list[str] = []  # qaysi belgilar muhim?


class ErrorResponse(BaseModel):
    detail: str
    error_code: str
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_path: str
    version: str = "1.0.0"


class ManagedModel(BaseModel):
    name: str
    path: str
    size_bytes: int = 0
    created_at: str
    is_primary: bool = False
    is_fallback: bool = False


class ModelRegistryResponse(BaseModel):
    primary_model: str
    fallback_models: list[str]
    models: list[ManagedModel]


class ModelUpdateRequest(BaseModel):
    set_as_primary: bool | None = None
    use_as_fallback: bool | None = None


class ModelOperationResponse(BaseModel):
    detail: str
    model: ManagedModel | None = None
