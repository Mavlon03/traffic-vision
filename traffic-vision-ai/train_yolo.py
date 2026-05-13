from pathlib import Path

from ultralytics import YOLO


PROJECT_ROOT = Path(__file__).resolve().parent
DATASET_ROOT = PROJECT_ROOT / "dataset"
DATA_YAML = DATASET_ROOT / "data.yaml"
BASE_MODEL = PROJECT_ROOT / "models" / "yolov8n.pt"
RUN_NAME = "uz_signs_v1"


def build_runtime_data_yaml() -> Path:
    class_names = [
        line.strip()
        for line in (DATASET_ROOT / "classes.txt").read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    runtime_yaml = DATASET_ROOT / "data.runtime.yaml"
    lines = [
        f"path: {DATASET_ROOT.as_posix()}",
        "train: images/train",
        "val: images/val",
        "test: images/test",
        "",
        "names:",
    ]
    lines.extend(f"  {idx}: {name}" for idx, name in enumerate(class_names))
    runtime_yaml.write_text("\n".join(lines), encoding="utf-8")
    return runtime_yaml


def main() -> None:
    if not DATA_YAML.exists():
        raise FileNotFoundError(f"Dataset config topilmadi: {DATA_YAML}")

    if not BASE_MODEL.exists():
        raise FileNotFoundError(f"Base model topilmadi: {BASE_MODEL}")

    runtime_yaml = build_runtime_data_yaml()
    model = YOLO(str(BASE_MODEL))
    model.train(
        data=str(runtime_yaml),
        epochs=200,
        imgsz=320,
        batch=2,
        device="cpu",
        project="runs/detect",
        name=RUN_NAME,
        exist_ok=True,
        patience=40,
        degrees=0.0,
        translate=0.0,
        scale=0.05,
        shear=0.0,
        fliplr=0.0,
        mosaic=0.0,
        mixup=0.0,
        erasing=0.0,
        close_mosaic=0,
        workers=0,
    )


if __name__ == "__main__":
    main()
