# Uzbekistan Traffic Signs Dataset

Bu papka YOLOv8 uchun O'zbekiston yo'l belgilarini tayyorlashga mo'ljallangan.

## Tavsiya etilgan klasslar

Hozirgi mini dataset uchun 5 ta klass ishlatiladi:

1. `stop`
2. `give_way`
3. `no_entry`
4. `children`
5. `parking`

## Papka tuzilmasi

```text
dataset/
  README.md
  classes.txt
  classes.json
  data.yaml
  raw/
  exports/
  images/
    train/
    val/
    test/
  labels/
    train/
    val/
    test/
  samples/
```

`images/` ichiga rasmlar joylanadi. `labels/` ichiga shu rasmlar uchun YOLO annotation fayllari yoziladi.

`raw/` ichiga video yoki yig'ilgan xom rasmlar tushadi.

`exports/` ichiga label qilingan rasm+txt juftliklari tushadi. Keyin `scripts/split_dataset.py` ularni train/val/test ga bo'ladi.

## YOLO label formati

Har bir rasmga mos `.txt` fayl bo'ladi:

```text
<class_id> <x_center> <y_center> <width> <height>
```

Barcha koordinatalar `0..1` oralig'ida normalizatsiya qilingan bo'lishi kerak.

Misol:

```text
0 0.521875 0.314583 0.078125 0.129167
```

## Rasm yig'ish bo'yicha minimum

Har bir klass uchun:

- minimum: `150` ta rasm
- yaxshi natija: `300-500` ta rasm
- kuchli natija: `1000+` ta rasm

Rasmlar turli sharoitdan bo'lsin:

- kunduz
- tun
- yomg'ir
- quyoshli
- yaqin masofa
- uzoq masofa
- qisman yopilgan
- aylangan yoki egilgan

## Manbalar

- o'zingiz olgan telefon rasmlari
- dashcam videodan frame ajratish
- Mapillary
- Roboflow Universe
- Kaggle

## Label qilish uchun qulay vositalar

- CVAT
- Label Studio
- Roboflow Annotate

## Repo ichidagi yordamchi scriptlar

- `scripts/extract_frames.py`
  Video yoki dashcam yozuvdan frame ajratadi.
- `scripts/split_dataset.py`
  Label qilingan datasetni train/val/test ga bo'ladi.
- `scripts/validate_dataset.py`
  YOLO label formatini tekshiradi.
- `scripts/bootstrap_dataset.ps1`
  Papkalarni qayta tayyorlaydi.

## Train/val/test tavsiyasi

- `70%` train
- `20%` val
- `10%` test

## Tayyor modelni backendga ulash

Trening tugagach odatda model shu yerda chiqadi:

```text
runs/detect/uz_signs_v1/weights/best.pt
```

Shuni `models/` papkaga nusxalab, `.env` ichida yangilang:

```env
MODEL_PATH=models/uz_signs_best.pt
CONFIDENCE_THRESHOLD=0.35
IOU_THRESHOLD=0.45
```
