#!/usr/bin/env python3
"""Fail an SSX-private Isabel release if runtime-critical external dependencies remain.

Development may temporarily use public reference assets. A private SSX release may not.
This audit scans the browser/runtime source and flags externally hosted avatar models,
animation clips, speech endpoints, memory/data endpoints, and other network dependencies.

Run:
  python3 tools/audit-isabel-ssx-private.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN_DIRS = [ROOT / "app", ROOT / "public"]
TEXT_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".json", ".mjs", ".cjs", ".html"}

# These are build/dev infrastructure references, not Isabel runtime dependencies.
ALLOWLIST = (
    "http://127.0.0.1",
    "http://localhost",
    "https://github.com/",
    "https://api.github.com/",
)

URL_RE = re.compile(r"https?://[^\s\"'`<>]+")


def should_scan(path: Path) -> bool:
    if path.suffix.lower() not in TEXT_SUFFIXES:
        return False
    parts = set(path.parts)
    return "node_modules" not in parts and ".next" not in parts


def main() -> int:
    findings: list[tuple[Path, int, str]] = []
    for directory in SCAN_DIRS:
        if not directory.exists():
            continue
        for path in directory.rglob("*"):
            if not path.is_file() or not should_scan(path):
                continue
            try:
                lines = path.read_text(encoding="utf-8").splitlines()
            except UnicodeDecodeError:
                continue
            for line_no, line in enumerate(lines, 1):
                for url in URL_RE.findall(line):
                    if url.startswith(ALLOWLIST):
                        continue
                    findings.append((path.relative_to(ROOT), line_no, url))

    if findings:
        print("ISABEL_SSX_PRIVATE_AUDIT_FAIL")
        for path, line_no, url in findings:
            print(f"  {path}:{line_no} external_runtime_reference={url}")
        print("Private SSX release is blocked until these runtime references are local or removed.")
        return 1

    print("ISABEL_SSX_PRIVATE_AUDIT_OK external_runtime_references=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
