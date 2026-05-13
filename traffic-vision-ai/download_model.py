"""
YOLOv8 modelini yuklab olish va tekshirish scripti.
Ishlatish: python download_model.py
"""
import os
import sys


def download_model(model_name: str = "yolov8n.pt", output_dir: str = "models") -> str:
    """YOLOv8 modelini yuklab oladi."""
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, model_name)

    if os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"✅ Model allaqachon mavjud: {output_path} ({size_mb:.1f} MB)")
        return output_path

    print(f"⬇️  Model yuklanmoqda: {model_name}")
    print("   (Ultralytics avtomatik yuklab oladi...)")

    try:
        from ultralytics import YOLO
        model = YOLO(model_name)  # Ultralytics cache'dan yoki internetdan yuklab oladi

        # models/ papkasiga ko'chirish
        import shutil
        cached = model.ckpt_path if hasattr(model, "ckpt_path") else None

        # Agar model allaqachon models/ papkasida bo'lsa
        if os.path.exists(model_name):
            shutil.move(model_name, output_path)
        elif cached and os.path.exists(cached):
            shutil.copy(cached, output_path)
        else:
            # Ultralytics ~/.cache/ultralytics/models da saqlaydi
            import pathlib
            home_cache = pathlib.Path.home() / ".cache" / "ultralytics" / "models" / model_name
            alt_cache = pathlib.Path.home() / ".cache" / "ultralytics" / model_name
            for cache_path in [home_cache, alt_cache]:
                if cache_path.exists():
                    shutil.copy(cache_path, output_path)
                    break

        if os.path.exists(output_path):
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"✅ Model muvaffaqiyatli yuklandi: {output_path} ({size_mb:.1f} MB)")
        else:
            print(f"⚠️  Model yuklanib, lekin {output_path} da topilmadi.")
            print(f"   Model ishlaydi (Ultralytics cache dan foydalanadi).")

        return output_path

    except ImportError:
        print("❌ Ultralytics o'rnatilmagan. Avval o'rnating:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Yuklashda xato: {e}")
        sys.exit(1)


def verify_model(model_path: str) -> bool:
    """Model ishlayotganini tekshiradi."""
    print(f"\n🔍 Model tekshirilmoqda: {model_path}")
    try:
        from ultralytics import YOLO
        import numpy as np

        model = YOLO(model_path)
        # Sinov uchun 640x640 bo'sh rasm
        dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
        results = model.predict(source=dummy_image, conf=0.5, verbose=False)
        print(f"✅ Model muvaffaqiyatli ishlaydi!")
        print(f"   Sinf soni: {len(model.names)}")
        print(f"   Sinflar (birinchi 10): {list(model.names.values())[:10]}")
        return True
    except Exception as e:
        print(f"❌ Model tekshirishda xato: {e}")
        return False


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="YOLOv8 modelini yuklab olish")
    parser.add_argument(
        "--model",
        default="yolov8n.pt",
        choices=["yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt"],
        help="Model o'lchami (n=nano, s=small, m=medium, l=large, x=xlarge)"
    )
    parser.add_argument("--output-dir", default="models", help="Saqlash papkasi")
    parser.add_argument("--verify", action="store_true", help="Yuklab olgandan so'ng tekshirish")
    args = parser.parse_args()

    print("=" * 50)
    print("Traffic Vision — YOLOv8 Model Yuklovchi")
    print("=" * 50)
    print(f"Model: {args.model}")
    print(f"Papka: {args.output_dir}")
    print()

    model_path = download_model(args.model, args.output_dir)

    if args.verify:
        verify_model(model_path)

    print()
    print("=" * 50)
    print("Keyingi qadam:")
    print(f"  .env faylida MODEL_PATH={args.output_dir}/{args.model} ni tekshiring")
    print("  python -m app.main  yoki  uvicorn app.main:app --port 5000")
    print("=" * 50)
