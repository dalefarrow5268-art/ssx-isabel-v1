"""Discover exact MPFB facial target names for deterministic Isabel likeness fitting.

Preferred run mode is inside Blender with MPFB loaded. In that mode the script asks
MPFB's LocationService for its bundled system-data directory and scans the real
character target library there. --root remains available only as a fallback/debug aid.
"""
from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

FAMILIES = {
    "face_outline": ["head", "face", "oval", "width"],
    "jaw": ["jaw", "mandible", "width", "angle"],
    "chin": ["chin", "point", "width", "height"],
    "eyes": ["eye", "eyes", "size", "distance", "spacing", "height", "almond"],
    "brows": ["brow", "eyebrow", "height", "arch"],
    "nose": ["nose", "nostril", "bridge", "tip", "width", "size", "length"],
    "mouth": ["mouth", "lip", "lips", "cupid", "width", "height"],
    "cheeks": ["cheek", "cheekbone", "malar", "full"],
}


def dynamic_import(package_suffix: str, key: str):
    for module_name in tuple(sys.modules):
        if module_name.endswith(package_suffix):
            module = importlib.import_module(module_name)
            if hasattr(module, key):
                return getattr(module, key)
    raise RuntimeError(f"MPFB service not loaded: {package_suffix}.{key}")


def resolve_root(explicit: str) -> tuple[Path, str]:
    if explicit:
        return Path(explicit).expanduser().resolve(), "explicit"
    LocationService = dynamic_import("mpfb.services.locationservice", "LocationService")
    root = Path(LocationService.get_mpfb_data()).resolve()
    return root, "mpfb-system-data"


def score(path: Path, words: list[str]) -> int:
    hay = path.as_posix().lower().replace("_", "-")
    return sum(3 if f"/{word}" in hay else 1 for word in words if word in hay)


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default="")
    parser.add_argument("--top", type=int, default=40)
    parser.add_argument("--json", default="")
    args = parser.parse_args(argv)

    root, source = resolve_root(args.root)
    candidates = sorted(root.rglob("*.target"))
    if not candidates:
        raise RuntimeError(f"No .target files found under {root} ({source})")

    report: dict[str, object] = {
        "source": source,
        "root": str(root),
        "total_targets": len(candidates),
        "families": {},
    }
    families = report["families"]
    assert isinstance(families, dict)
    for family, words in FAMILIES.items():
        ranked = [(score(path, words), path) for path in candidates]
        ranked = [(s, p) for s, p in ranked if s]
        ranked.sort(key=lambda item: (-item[0], item[1].as_posix()))
        entries = [
            {"score": s, "name": path.stem, "path": path.relative_to(root).as_posix()}
            for s, path in ranked[: args.top]
        ]
        families[family] = entries
        print(f"ISABEL_TARGET_FAMILY {family} count={len(entries)}")
        for item in entries[:12]:
            print(f"  score={item['score']} name={item['name']} path={item['path']}")

    print(f"ISABEL_TARGET_DISCOVERY_OK files={len(candidates)} root={root} source={source}")
    if args.json:
        out = Path(args.json).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"ISABEL_TARGET_REPORT {out}")


if __name__ == "__main__":
    main()
