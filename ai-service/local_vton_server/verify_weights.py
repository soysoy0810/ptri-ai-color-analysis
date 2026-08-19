"""Verify a staged/transferred IDM-VTON weight set.

Run once on the kiosk after staging to write a manifest, then again on the GPU
box after the transfer to confirm nothing was truncated or corrupted. A silent
bad byte in a 12 GB tensor file does not announce itself — it surfaces later as
an unexplainable load error or garbage output, after you have already spent an
afternoon on it.

    python verify_weights.py write  ~/ptri-vton-weights/IDM-VTON
    python verify_weights.py check  /opt/idm-vton/ckpt/IDM-VTON
"""

from __future__ import annotations

import hashlib
import json
import os
import sys

MANIFEST = "weights_manifest.json"
SKIP_DIRS = {".cache", ".git"}


def _digest(path: str, chunk: int = 8 << 20) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(chunk), b""):
            h.update(block)
    return h.hexdigest()


def _walk(root: str):
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in sorted(files):
            if name == MANIFEST:
                continue
            full = os.path.join(base, name)
            if os.path.islink(full):
                continue
            yield os.path.relpath(full, root), full


def write(root: str) -> int:
    entries = {}
    for rel, full in _walk(root):
        entries[rel] = {"size": os.path.getsize(full), "sha256": _digest(full)}
        print(f"  hashed {rel}", flush=True)
    with open(os.path.join(root, MANIFEST), "w") as fh:
        json.dump(entries, fh, indent=2, sort_keys=True)
    total = sum(e["size"] for e in entries.values())
    print(f"\nmanifest written: {len(entries)} files, {total / 1e9:.2f} GB")
    return 0


def check(root: str) -> int:
    manifest_path = os.path.join(root, MANIFEST)
    if not os.path.exists(manifest_path):
        print(f"No {MANIFEST} in {root} — run 'write' on the source first.")
        return 2

    with open(manifest_path) as fh:
        expected = json.load(fh)

    present = dict(_walk(root))
    missing, corrupt = [], []

    for rel, meta in expected.items():
        full = present.get(rel)
        if full is None:
            missing.append(rel)
            continue
        if os.path.getsize(full) != meta["size"]:
            corrupt.append(f"{rel} (size mismatch)")
            continue
        if _digest(full) != meta["sha256"]:
            corrupt.append(f"{rel} (checksum mismatch)")

    extra = sorted(set(present) - set(expected))

    for label, items in (("MISSING", missing), ("CORRUPT", corrupt), ("EXTRA", extra)):
        for item in items:
            print(f"{label}: {item}")

    if missing or corrupt:
        print(f"\nFAILED — {len(missing)} missing, {len(corrupt)} corrupt.")
        return 1

    print(f"\nOK — {len(expected)} files verified, transfer is intact.")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("write", "check"):
        sys.exit(__doc__)
    sys.exit((write if sys.argv[1] == "write" else check)(os.path.expanduser(sys.argv[2])))
