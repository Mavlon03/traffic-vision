from __future__ import annotations

import argparse
from pathlib import Path

import cv2


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Video yoki dashcam fayldan dataset uchun frame ajratadi.",
    )
    parser.add_argument("video", type=Path, help="Video fayl manzili")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("dataset/raw"),
        help="Saqlanadigan papka",
    )
    parser.add_argument(
        "--every-n-frames",
        type=int,
        default=15,
        help="Har nechanchi frame saqlanishi",
    )
    parser.add_argument(
        "--prefix",
        type=str,
        default="frame",
        help="Fayl prefiksi",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    capture = cv2.VideoCapture(str(args.video))
    if not capture.isOpened():
        raise RuntimeError(f"Video ochilmadi: {args.video}")

    frame_index = 0
    saved = 0

    while True:
        success, frame = capture.read()
        if not success:
            break

        if frame_index % args.every_n_frames == 0:
            output_path = args.output / f"{args.prefix}_{saved:05d}.jpg"
            cv2.imwrite(str(output_path), frame)
            saved += 1

        frame_index += 1

    capture.release()
    print(f"Saqlandi: {saved} ta frame -> {args.output}")


if __name__ == "__main__":
    main()
