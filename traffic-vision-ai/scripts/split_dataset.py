from __future__ import annotations

import argparse
import random
import shutil
from pathlib import Path


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Raw datasetni train/val/test ga bo'ladi.",
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("dataset/exports"),
        help="Label qilingan source dataset",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed",
    )
    parser.add_argument("--train-ratio", type=float, default=0.7)
    parser.add_argument("--val-ratio", type=float, default=0.2)
    parser.add_argument("--test-ratio", type=float, default=0.1)
    return parser.parse_args()


def copy_pair(image_path: Path, target_split: str) -> None:
    label_path = image_path.with_suffix(".txt")
    target_image = Path("dataset/images") / target_split / image_path.name
    target_label = Path("dataset/labels") / target_split / label_path.name

    target_image.parent.mkdir(parents=True, exist_ok=True)
    target_label.parent.mkdir(parents=True, exist_ok=True)

    shutil.copy2(image_path, target_image)
    shutil.copy2(label_path, target_label)


def main() -> None:
    args = parse_args()
    total_ratio = args.train_ratio + args.val_ratio + args.test_ratio
    if abs(total_ratio - 1.0) > 1e-9:
        raise ValueError("Train/val/test ratio yig'indisi 1.0 bo'lishi kerak")

    for split in ("train", "val", "test"):
        for directory in (Path("dataset/images") / split, Path("dataset/labels") / split):
            if directory.exists():
                for item in directory.iterdir():
                    if item.is_file() and item.name != ".gitkeep":
                        item.unlink()

    images = [
        path
        for path in args.source.rglob("*")
        if path.suffix.lower() in IMAGE_EXTENSIONS and path.with_suffix(".txt").exists()
    ]

    if not images:
        raise FileNotFoundError(
            f"Split uchun rasm+label juftligi topilmadi: {args.source}",
        )

    random.seed(args.seed)
    random.shuffle(images)

    total = len(images)
    train_end = int(total * args.train_ratio)
    val_end = train_end + int(total * args.val_ratio)

    for index, image_path in enumerate(images):
        if index < train_end:
            split = "train"
        elif index < val_end:
            split = "val"
        else:
            split = "test"
        copy_pair(image_path, split)

    print(
        f"Dataset split tayyor: total={total}, "
        f"train={train_end}, val={val_end - train_end}, test={total - val_end}",
    )


if __name__ == "__main__":
    main()
