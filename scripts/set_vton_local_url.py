#!/usr/bin/env python3
"""Point the kiosk at a CatVTON GPU server. Never prints secrets.

    python scripts/set_vton_local_url.py https://xxxx.trycloudflare.com

Sets VTON_PROVIDER=catvton and VTON_LOCAL_URL, leaves HF_TOKEN untouched.
Restart the AI LaunchAgent after this.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "ai-service" / ".env"


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].strip():
        print("usage: python scripts/set_vton_local_url.py https://<gpu-host>:8010")
        return 2
    url = sys.argv[1].strip().rstrip("/")
    if url.startswith("http://127.0.0.1:8001") or url.startswith("http://localhost:8001"):
        print("REFUSE: 8001 is the kiosk FastAPI port. CatVTON listens on 8010 (or a Colab tunnel).")
        return 2

    lines = ENV.read_text().splitlines() if ENV.exists() else []
    keys = {
        "VTON_PROVIDER": "catvton",
        "VTON_FALLBACK_PROVIDER": "huggingface_idm_vton",
        "VTON_LOCAL_URL": url,
    }
    seen = set()
    out = []
    for line in lines:
        raw = line.split("=", 1)[0].strip()
        name = raw[1:] if raw.startswith("#") and raw[1:] in keys else raw
        if name in keys and name not in seen:
            out.append(f"{name}={keys[name]}")
            seen.add(name)
            continue
        if name in keys:
            continue
        out.append(line)
    for name, value in keys.items():
        if name not in seen:
            out.append(f"{name}={value}")
    ENV.write_text("\n".join(out) + "\n")
    print("updated VTON_PROVIDER=catvton")
    print("updated VTON_LOCAL_URL (host only, not printed)")
    print("restart: launchctl kickstart -k gui/$(id -u)/ph.ptri.ai-color")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
