import base64
import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.detector import detector
from app.preprocessor import validate_file_extension
from app.schemas import DetectionResponse, ErrorResponse, HealthResponse, VideoFrameResponse

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
    description="Yo'l harakati belgilarini real vaqtda aniqlash API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "*"],
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


# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    model_loaded = detector.is_ready()
    return HealthResponse(
        status="ok" if model_loaded else "model_not_loaded",
        model_loaded=model_loaded,
        model_path=settings.model_path,
        version="2.0.0",
    )


# ─── Rasm yuklash orqali aniqlash (mavjud) ─────────────────────────────────────

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


# ─── Video frame (base64) orqali real-time aniqlash ────────────────────────────

@app.post("/detect/frame", response_model=VideoFrameResponse)
async def detect_frame(file: UploadFile = File(...), frame_id: int = 0) -> VideoFrameResponse:
    """
    Kamera frame'ini yuborish orqali real-time aniqlash.
    Natijada has_critical_sign = True bo'lsa, frontend ovozli bildirishnoma chiqaradi.
    """
    if not detector.is_ready():
        raise HTTPException(status_code=503, detail="AI model hali yuklanmagan")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Frame bo'sh")

    try:
        result = detector.detect_from_base64_frame(file_bytes, frame_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("Frame detection xatosi: %s", e)
        raise HTTPException(status_code=500, detail="Frame aniqlashda xato") from e

    return result


# ─── WebSocket: Real-time kamera stream ────────────────────────────────────────

@app.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    """
    WebSocket orqali real-time kamera oqimi.

    Protokol:
      Mijoz -> Server:  JSON { "frame": "<base64 encoded JPEG>", "frame_id": 0 }
      Server -> Mijoz:  JSON VideoFrameResponse (has_critical_sign, signs, descriptions...)

    Frontend bu natijaga asoslanib:
      1. Aniqlangan belgilarni ekranda ko'rsatadi
      2. has_critical_sign = true bo'lsa Web Speech API orqali ovozli bildirishnoma beradi
    """
    await websocket.accept()
    logger.info("WebSocket ulanish qabul qilindi: %s", websocket.client)

    if not detector.is_ready():
        await websocket.send_json({"error": "AI model yuklanmagan"})
        await websocket.close(code=1013)
        return

    frame_counter = 0
    try:
        while True:
            data = await websocket.receive_json()

            frame_b64 = data.get("frame")
            frame_id = data.get("frame_id", frame_counter)

            if not frame_b64:
                await websocket.send_json({"error": "frame maydoni bo'sh"})
                continue

            # Base64 -> bytes -> numpy frame
            try:
                frame_bytes = base64.b64decode(frame_b64)
                result = detector.detect_from_base64_frame(frame_bytes, frame_id)
                await websocket.send_json(result.model_dump())
            except Exception as e:
                logger.warning("Frame qayta ishlashda xato: %s", e)
                await websocket.send_json({
                    "error": str(e),
                    "frame_id": frame_id,
                })

            frame_counter += 1

    except WebSocketDisconnect:
        logger.info("WebSocket ulanish uzildi: %s", websocket.client)
    except Exception as e:
        logger.error("WebSocket xatosi: %s", e)
        try:
            await websocket.close(code=1011)
        except Exception:
            pass


# ─── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Traffic Vision AI Server v2.0",
        "docs": "/docs",
        "websocket": "/ws/detect",
        "frame_detect": "/detect/frame",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level=settings.log_level,
    )
