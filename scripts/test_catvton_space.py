#!/usr/bin/env python3
"""Probe CatVTON Hugging Face Space. Never prints HF_TOKEN.

This is an investigation, not a claim of visual success. ZeroGPU quota is
account-wide: if IDM-VTON just exhausted it, CatVTON on the same account
will usually fail the same way.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ai-service"))

from app.core.config import CATVTON_SPACE, HF_TOKEN  # noqa: E402
from app.services.tryon import _safe_exc  # noqa: E402


def main() -> int:
    print("space", CATVTON_SPACE)
    print("authenticated", bool(HF_TOKEN))
    try:
        from gradio_client import Client
    except ImportError:
        print("RESULT=FAIL gradio_client missing")
        return 1

    started = time.time()
    try:
        client = Client(CATVTON_SPACE, hf_token=HF_TOKEN or None, verbose=False)
        print("connected_s", round(time.time() - started, 1))
        api = getattr(client, "view_api", None)
        if callable(api):
            # Print endpoint names only — not a generation.
            try:
                info = client.view_api(return_format="dict")
                named = []
                if isinstance(info, dict):
                    named = list((info.get("named_endpoints") or {}).keys())
                print("named_endpoints", named[:20])
            except Exception as exc:  # noqa: BLE001
                print("view_api_error", _safe_exc(exc))
        print("RESULT=CONNECTED (no image generated in this probe)")
        return 0
    except Exception as exc:  # noqa: BLE001
        text = _safe_exc(exc)
        print("error", text)
        lowered = text.lower()
        if "quota" in lowered:
            print("RESULT=FAIL ZeroGPU quota (shared with IDM-VTON)")
        else:
            print("RESULT=FAIL could not use CatVTON Space")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
