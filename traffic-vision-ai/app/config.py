from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_path: str = "models/yolov8n.pt"
    confidence_threshold: float = 0.45
    iou_threshold: float = 0.45
    max_image_size: int = 1280
    allowed_extensions: str = "jpg,jpeg,png,bmp,webp"
    port: int = 5000
    host: str = "0.0.0.0"
    log_level: str = "info"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [ext.strip().lower().lstrip(".") for ext in self.allowed_extensions.split(",") if ext.strip()]


settings = Settings()
