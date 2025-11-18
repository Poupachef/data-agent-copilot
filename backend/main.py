#!/usr/bin/env python3
"""
WhatsApp Web Backend - API principal.
Serve frontend e conecta com Waha API via proxy.
"""

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import BACKEND_HOST, BACKEND_PORT, LOG_FORMAT, LOG_LEVEL, RELOAD
from routes import setup_routes

# Configura logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# Cria aplicação FastAPI
app = FastAPI(title="WhatsApp Web API")

# Configura CORS para permitir requisições do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique origens específicas
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configura rotas
setup_routes(app)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=BACKEND_HOST,
        port=BACKEND_PORT,
        reload=RELOAD
    )
