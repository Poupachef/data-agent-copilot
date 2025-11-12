#!/usr/bin/env python3
"""
WhatsApp Web Backend - Minimalista
Serve frontend e conecta com Waha API
"""

import json
import logging
from pathlib import Path
from typing import Dict, Set

import uvicorn
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

# Import configuration
from config import *

# Setup
app = FastAPI(title="WhatsApp Web API")
logging.basicConfig(level=getattr(logging, LOG_LEVEL), format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# WebSocket connections
connections: Dict[str, Set[WebSocket]] = {}

# Serve frontend
app.mount("/static", StaticFiles(directory=FRONTEND_PATH), name="static")

@app.get("/", response_class=HTMLResponse)
async def home():
    """Serve frontend"""
    with open(FRONTEND_PATH / "index.html", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/ping")
async def ping():
    """Endpoint de teste"""
    return JSONResponse({"status": "ok", "message": "Backend is running"})

# Generic API Proxy - handles all /api/* requests
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def api_proxy(request: Request, path: str):
    """Proxy genérico para Waha API"""
    async with httpx.AsyncClient() as client:
        url = f"{WAHA_URL}/api/{path}"
        params = dict(request.query_params)
        
        # Headers a encaminhar: Content-Type (se houver) e X-Api-Key (se configurado)
        forward_headers = {}
        ct = request.headers.get("content-type")
        if ct:
            forward_headers["Content-Type"] = ct
        if WAHA_API_KEY:
            forward_headers["X-Api-Key"] = WAHA_API_KEY
        
        try:
            # Handle request
            if request.method == "GET":
                response = await client.get(url, params=params, headers=forward_headers)
            else:
                body = await request.body()
                response = await client.request(
                    request.method,
                    url,
                    params=params,
                    content=body,
                    headers=forward_headers or {"Content-Type": "application/json"}
                )
            
            # Handle media files
            if path.startswith("files/"):
                if response.status_code == 200:
                    return Response(
                        content=response.content,
                        media_type=response.headers.get("content-type", "application/octet-stream")
                    )
                else:
                    return JSONResponse({"error": "File not found"}, status_code=404)
            
            # Handle QR code responses (PNG data)
            if path.endswith("/qr") and response.status_code == 200:
                return Response(
                    content=response.content,
                    media_type="image/png"
                )
            
            # Repassar as demais respostas preservando status e content-type
            return Response(
                content=response.content,
                status_code=response.status_code,
                media_type=response.headers.get("content-type", "application/json")
            )
            
        except httpx.RequestError as e:
            logger.error(f"API Request Error: {repr(e)}")
            return JSONResponse({"error": str(e)}, status_code=502)
        except Exception as e:
            logger.error(f"API Error: {e}")
            return JSONResponse({"error": str(e)}, status_code=500)

# WebSocket
@app.websocket("/ws/{phone}")
async def websocket_endpoint(websocket: WebSocket, phone: str):
    """WebSocket para eventos em tempo real"""
    await websocket.accept()
    
    if phone not in connections:
        connections[phone] = set()
    connections[phone].add(websocket)
    
    logger.info(f"🔌 WebSocket conectado: {phone}")
    
    try:
        while True:
            await websocket.receive_text()  # Keepalive
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket desconectado: {phone}")
        connections[phone].discard(websocket)
        if not connections[phone]:
            del connections[phone]

# Generic webhook handler
@app.post("/webhook")
async def webhook_handler(request: Request):
    """Handler genérico para webhooks"""
    try:
        data = await request.json()
        event_type = data.get("event", "unknown")
        
        # Broadcast to all WebSocket connections
        for phone_connections in connections.values():
            for websocket in phone_connections:
                try:
                    await websocket.send_text(json.dumps(data))
                except:
                    pass  # Connection might be closed
        
        logger.info(f"📨 Webhook {event_type} processado")
        return JSONResponse({"status": "ok"})
        
    except Exception as e:
        logger.error(f"❌ Webhook error: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# Individual webhook endpoints (for compatibility)
@app.post("/webhook/{event_type}")
async def webhook_event(request: Request, event_type: str):
    """Handler para webhooks específicos"""
    return await webhook_handler(request)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True) 