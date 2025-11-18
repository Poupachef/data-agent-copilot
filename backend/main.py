#!/usr/bin/env python3
"""
WhatsApp Web Backend - API principal.
Serve frontend e conecta com Waha API via proxy.
"""

import logging

import uvicorn
from fastapi import FastAPI

from config import BACKEND_HOST, BACKEND_PORT, LOG_FORMAT, LOG_LEVEL, RELOAD
from routes import setup_routes

# Configura logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# Cria aplicação FastAPI
app = FastAPI(title="WhatsApp Web API")

# Configura rotas
setup_routes(app)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=BACKEND_HOST,
        port=BACKEND_PORT,
        reload=RELOAD
    )
