from __future__ import annotations

from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
CLASS_COUNT = 5


def validate_split(split: str) -> tuple[int, int]:
    image_dir = Path("dataset/images") / split
    label_dir = Path("dataset/labels") / split

    image_count = 0
    box_count = 0

    for image_path in image_dir.iterdir():
        if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        image_count += 1
        label_path = label_dir / f"{image_path.stem}.txt"
        if not label_path.exists():
            raise FileNotFoundError(f"Label topilmadi: {label_path}")

        lines = [line.strip() for line in label_path.read_text().splitlines() if line.strip()]
        for line in lines:
            parts = line.split()
            if len(parts) != 5:
                raise ValueError(f"Noto'g'ri label formati: {label_path} -> {line}")

            class_id = int(parts[0])
            if not 0 <= class_id < CLASS_COUNT:
                raise ValueError(f"Class id noto'g'ri: {label_path} -> {class_id}")

            for value in parts[1:]:
                number = float(value)
                if not 0.0 <= number <= 1.0:
                    raise ValueError(
                        f"Koordinata 0..1 oralig'ida emas: {label_path} -> {line}",
                    )
            box_count += 1

    return image_count, box_count


def main() -> None:
    grand_images = 0
    grand_boxes = 0

    for split in ("train", "val", "test"):
        images, boxes = validate_split(split)
        grand_images += images
        grand_boxes += boxes
        print(f"{split}: images={images}, boxes={boxes}")

    print(f"OK: images={grand_images}, boxes={grand_boxes}")


if __name__ == "__main__":
    main()
