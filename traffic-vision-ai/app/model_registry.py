from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from threading import RLock


class ModelRegistry:
    def __init__(self, models_dir: str, registry_file: str, default_model_path: str) -> None:
        self.models_dir = Path(models_dir)
        self.registry_path = Path(registry_file)
        self.default_model_path = Path(default_model_path)
        self._lock = RLock()

    def ensure_initialized(self) -> None:
        with self._lock:
            self.models_dir.mkdir(parents=True, exist_ok=True)
            if not self.registry_path.parent.exists():
                self.registry_path.parent.mkdir(parents=True, exist_ok=True)

            data = self._load_unlocked()
            default_name = self.default_model_path.name
            default_entry = self._build_entry(default_name, self.default_model_path)

            if not data["models"]:
                data["models"].append(default_entry)
                data["primary_model"] = default_name
            else:
                existing = self._find_model_unlocked(data, default_name)
                if existing is None:
                    data["models"].append(default_entry)
                if not data["primary_model"]:
                    data["primary_model"] = default_name

            data["fallback_models"] = [
                name for name in data["fallback_models"] if self._find_model_unlocked(data, name) is not None
            ]
            self._save_unlocked(data)

    def list_models(self) -> dict:
        with self._lock:
            data = self._load_unlocked()
            return self._with_flags(data)

    def get_model(self, name: str) -> dict | None:
        with self._lock:
            data = self._load_unlocked()
            model = self._find_model_unlocked(data, name)
            if model is None:
                return None
            return self._decorate_model(data, model)

    def get_primary_model(self) -> dict:
        with self._lock:
            data = self._load_unlocked()
            model = self._find_model_unlocked(data, data["primary_model"])
            if model is None:
                raise FileNotFoundError("Asosiy model topilmadi")
            return self._decorate_model(data, model)

    def get_fallback_models(self) -> list[dict]:
        with self._lock:
            data = self._load_unlocked()
            result: list[dict] = []
            for name in data["fallback_models"]:
                model = self._find_model_unlocked(data, name)
                if model is not None:
                    result.append(self._decorate_model(data, model))
            return result

    def detection_order(self) -> list[dict]:
        primary = self.get_primary_model()
        fallback = self.get_fallback_models()
        return [primary, *fallback]

    def add_model(self, filename: str) -> dict:
        with self._lock:
            data = self._load_unlocked()
            if self._find_model_unlocked(data, filename) is not None:
                raise FileExistsError(f"{filename} allaqachon mavjud")

            relative_path = Path(self.models_dir.name) / filename
            entry = self._build_entry(filename, relative_path)
            data["models"].append(entry)
            self._save_unlocked(data)
            return self._decorate_model(data, entry)

    def update_model(self, name: str, set_as_primary: bool | None, use_as_fallback: bool | None) -> dict:
        with self._lock:
            data = self._load_unlocked()
            model = self._find_model_unlocked(data, name)
            if model is None:
                raise FileNotFoundError(f"{name} topilmadi")

            if set_as_primary:
                data["primary_model"] = name
                data["fallback_models"] = [item for item in data["fallback_models"] if item != name]

            if use_as_fallback is True:
                if name != data["primary_model"] and name not in data["fallback_models"]:
                    data["fallback_models"].append(name)
            elif use_as_fallback is False:
                data["fallback_models"] = [item for item in data["fallback_models"] if item != name]

            self._save_unlocked(data)
            updated = self._find_model_unlocked(data, name)
            if updated is None:
                raise FileNotFoundError(f"{name} topilmadi")
            return self._decorate_model(data, updated)

    def delete_model(self, name: str) -> None:
        with self._lock:
            data = self._load_unlocked()
            if data["primary_model"] == name:
                raise ValueError("Asosiy modelni o'chirish mumkin emas")

            model = self._find_model_unlocked(data, name)
            if model is None:
                raise FileNotFoundError(f"{name} topilmadi")

            data["models"] = [item for item in data["models"] if item["name"] != name]
            data["fallback_models"] = [item for item in data["fallback_models"] if item != name]
            self._save_unlocked(data)

            target = self.registry_path.parent / model["path"]
            if not target.is_absolute():
                target = self.registry_path.parent / model["path"]
            if target.exists():
                target.unlink()

    def _load_unlocked(self) -> dict:
        if not self.registry_path.exists():
            return {
                "primary_model": "",
                "fallback_models": [],
                "models": [],
            }

        return json.loads(self.registry_path.read_text(encoding="utf-8"))

    def _save_unlocked(self, data: dict) -> None:
        self.registry_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def _find_model_unlocked(self, data: dict, name: str) -> dict | None:
        for model in data["models"]:
            if model["name"] == name:
                return model
        return None

    def _build_entry(self, name: str, relative_path: Path) -> dict:
        target = relative_path if relative_path.is_absolute() else self.registry_path.parent / relative_path
        size_bytes = target.stat().st_size if target.exists() else 0
        return {
            "name": name,
            "path": str(relative_path).replace("\\", "/"),
            "size_bytes": size_bytes,
            "created_at": datetime.now().isoformat(),
        }

    def _decorate_model(self, data: dict, model: dict) -> dict:
        return {
            **model,
            "is_primary": data["primary_model"] == model["name"],
            "is_fallback": model["name"] in data["fallback_models"],
        }

    def _with_flags(self, data: dict) -> dict:
        return {
            "primary_model": data["primary_model"],
            "fallback_models": data["fallback_models"],
            "models": [self._decorate_model(data, model) for model in data["models"]],
        }
