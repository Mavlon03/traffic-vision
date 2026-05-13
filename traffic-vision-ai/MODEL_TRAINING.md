# YOLOv8 Training Guide

Bu loyiha uchun O'zbekiston yo'l belgilarini aniqlaydigan model tayyorlash jarayoni.

## 1. Dataset tayyorlash

`dataset/` papkasiga rasmlar va label fayllarni joylang:

```text
dataset/
  images/
    train/
    val/
    test/
  labels/
    train/
    val/
    test/
```

Misol:

```text
dataset/images/train/img_001.jpg
dataset/labels/train/img_001.txt
```

Agar sizda video bo'lsa, frame ajrating:

```powershell
python .\scripts\extract_frames.py .\dataset\samples\road_video.mp4 --every-n-frames 20
```

Keyin label qilingan juftliklarni `dataset/exports/` ichiga tashlang va split qiling:

```powershell
python .\scripts\split_dataset.py
python .\scripts\validate_dataset.py
```

## 2. Virtual environment

PowerShell:

```powershell
cd C:\Users\Mavlon\IdeaProjects\traffic-vision\traffic-vision-ai
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3. Trainingni ishga tushirish

```powershell
python train_yolo.py
```

Natijalar odatda shu yerga chiqadi:

```text
runs/detect/uz_signs_v1/
```

Eng muhim fayl:

```text
runs/detect/uz_signs_v1/weights/best.pt
```

## 4. Modelni backendga ulash

`best.pt` faylni `models/` ga ko'chiring:

```text
models/uz_signs_best.pt
```

Keyin `.env` ni yangilang:

```env
MODEL_PATH=models/uz_signs_best.pt
CONFIDENCE_THRESHOLD=0.35
IOU_THRESHOLD=0.45
```

## 5. FastAPI serverni qayta ishga tushirish

```powershell
python -m app.main
```

## 6. Agar belgilar chiqmasa

Quyidagilarni tekshiring:

- dataset kichik emasmi
- klasslar balansli emasmi
- label noto'g'ri emasmi
- `CONFIDENCE_THRESHOLD` juda yuqori emasmi

## 7. Keyingi yaxshilashlar

- `yolov8s.pt` bilan sinash
- speed sign klasslarini ko'paytirish
- dashcam video frame'lari bilan datasetni boyitish
- test setni alohida saqlash
