from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router

app = FastAPI(
    title="PTRI AI Color Analysis Service",
    version="0.1.0",
    description="AI/CV service for PTRI kiosk. Loads palette from shared/catalog.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
