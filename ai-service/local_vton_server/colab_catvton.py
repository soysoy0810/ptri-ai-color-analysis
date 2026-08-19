"""
Google Colab helper for a temporary CatVTON GPU server.

This is NOT a kiosk-grade host: Colab sessions end, the GPU type changes, and
the public URL dies. Use it only to prove CatVTON generation while a dedicated
NVIDIA box is unavailable.

Paste COLAB_SETUP into a Colab notebook (Runtime → GPU / T4).
Weights download once from Hugging Face. That is not the ZeroGPU Space.
"""

from pathlib import Path

SERVER_SRC = Path(__file__).with_name("catvton_server.py")

COLAB_SETUP = r'''
# Cell 1 — GPU check (must show Tesla T4 / A100 / L4, not CPU)
import torch
print("cuda", torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else None)
assert torch.cuda.is_available(), "Runtime → Change runtime type → T4 GPU"

# Cell 2 — CatVTON repo + HTTP wrapper
!git clone --depth 1 https://github.com/Zheng-Chong/CatVTON.git
%cd CatVTON
!pip -q install -r requirements.txt fastapi uvicorn huggingface_hub

# Cell 3 — upload catvton_server.py from the kiosk repo (Files pane), then:
!cp /content/catvton_server.py /content/CatVTON/catvton_server.py

# Cell 4 — start GPU server (first run downloads weights; several minutes)
import subprocess, time
proc = subprocess.Popen(
    ["python", "catvton_server.py"],
    stdout=open("/tmp/catvton.log", "w"),
    stderr=subprocess.STDOUT,
)
for _ in range(60):
    time.sleep(5)
    log = open("/tmp/catvton.log").read()
    if "Uvicorn running" in log or "Application startup complete" in log:
        print("server up")
        break
    if "CUDA is not available" in log or "CatVTON failed" in log:
        print(log[-2000:])
        raise SystemExit("CatVTON did not start")
else:
    print(open("/tmp/catvton.log").read()[-2000:])
    raise SystemExit("timed out waiting for CatVTON")

# Cell 5 — public tunnel. Copy the https://*.trycloudflare.com URL to the Mac:
#   python scripts/set_vton_local_url.py https://xxxx.trycloudflare.com
!wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
!chmod +x cloudflared
!./cloudflared tunnel --url http://127.0.0.1:8010
'''

if __name__ == "__main__":
    print(COLAB_SETUP)
    if SERVER_SRC.exists():
        print("# Also upload:", SERVER_SRC)
