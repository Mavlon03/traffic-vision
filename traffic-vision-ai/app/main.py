import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.detector import detector
from app.preprocessor import validate_file_extension
from app.schemas import DetectionResponse, ErrorResponse, HealthResponse

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Server ishga tushmoqda...")
    logger.info("Model yuklanmoqda: %s", settings.model_path)
    try:
        detector.load_model()
        logger.info("Model muvaffaqiyatli yuklandi!")
    except Exception:
        logger.exception("Model startup vaqtida yuklanmadi")
    logger.info("Server tayyor: http://%s:%s", settings.host, settings.port)

    yield

    logger.info("Server to'xtatilmoqda...")


app = FastAPI(
    title="Traffic Vision AI",
    description="Yo'l harakati belgilarini aniqlash API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        duration = (time.time() - start) * 1000
        logger.exception("%s %s -> 500 (%.1fms)", request.method, request.url.path, duration)
        raise

    duration = (time.time() - start) * 1000
    logger.info("%s %s -> %s (%.1fms)", request.method, request.url.path, response.status_code, duration)
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    error_response = ErrorResponse(
        detail=str(exc.detail),
        error_code=f"HTTP_{exc.status_code}",
        timestamp=datetime.now().isoformat(),
    )
    return JSONResponse(status_code=exc.status_code, content=error_response.model_dump())


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    model_loaded = detector.is_ready()
    return HealthResponse(
        status="ok" if model_loaded else "model_not_loaded",
        model_loaded=model_loaded,
        model_path=settings.model_path,
        version="1.0.0",
    )


@app.post("/detect", response_model=DetectionResponse)
async def detect(file: UploadFile = File(...)) -> DetectionResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Fayl tanlanmagan")

    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=415,
            detail=f"Qo'llab-quvvatlanmaydigan format. Ruxsat etilgan: {settings.allowed_extensions}",
        )

    if not detector.is_ready():
        raise HTTPException(status_code=503, detail="AI model hali yuklanmagan, qayta urinib ko'ring")

    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Fayl bo'sh")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Fayl juda katta (max 10MB)")

    try:
        signs, processing_time, image_size = detector.detect(file_bytes)
    except ValueError as exception:
        raise HTTPException(status_code=400, detail=str(exception)) from exception
    except Exception as exception:
        logger.error("Detection xatosi: %s", exception)
        raise HTTPException(status_code=500, detail="Aniqlash jarayonida xato yuz berdi") from exception

    return DetectionResponse(
        signs=signs,
        total_signs=len(signs),
        processing_time_ms=round(processing_time, 2),
        model_version="yolov8n",
        image_size=image_size,
    )


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Traffic Vision AI Server", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level=settings.log_level,
    )
