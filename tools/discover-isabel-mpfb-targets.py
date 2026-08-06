"""Discover exact MPFB facial target names for deterministic Isabel likeness fitting.

Run inside or outside Blender:
  python tools/discover-isabel-mpfb-targets.py --root /path/to/makehuman-assets/base

This deliberately does not guess MPFB runtime API calls. It inventories the real
installed .target files and ranks facial candidates so the likeness vector can bind
to exact names proven to exist in the CI environment.
"""
from __future__ import annotations

import argparse
import json
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


def score(path: Path, words: list[str]) -> int:
    hay = path.as_posix().lower().replace("_", "-")
    return sum(3 if f"/{word}" in hay else 1 for word in words if word in hay)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--top", type=int, default=30)
    parser.add_argument("--json", default="")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    candidates = sorted(root.rglob("*.target"))
    if not candidates:
        raise RuntimeError(f"No .target files found under {root}")

    report: dict[str, list[dict[str, object]]] = {}
    for family, words in FAMILIES.items():
        ranked = []
        for path in candidates:
            s = score(path, words)
            if s:
                ranked.append((s, path))
        ranked.sort(key=lambda item: (-item[0], item[1].as_posix()))
        report[family] = [
            {
                "score": s,
                "name": path.stem,
                "path": path.relative_to(root).as_posix(),
            }
            for s, path in ranked[: args.top]
        ]
        print(f"ISABEL_TARGET_FAMILY {family} count={len(report[family])}")
        for item in report[family][:10]:
            print(f"  score={item['score']} name={item['name']} path={item['path']}")

    print(f"ISABEL_TARGET_DISCOVERY_OK files={len(candidates)} root={root}")
    if args.json:
        out = Path(args.json).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"ISABEL_TARGET_REPORT {out}")


if __name__ == "__main__":
    main()
