"""
Rotas principais da aplicação.
Define endpoints HTTP e WebSocket.
"""

import logging
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from api_proxy import proxy_request
from config import FRONTEND_PATH
from webhook_handler import handle_webhook
from websocket_manager import manager

logger = logging.getLogger(__name__)


def setup_routes(app: FastAPI) -> None:
    """
    Configura todas as rotas da aplicação.
    
    Args:
        app: Instância do FastAPI
    """
    # Serve arquivos estáticos
    app.mount("/static", StaticFiles(directory=FRONTEND_PATH), name="static")
    
    @app.get("/", response_class=HTMLResponse)
    async def home() -> HTMLResponse:
        """Serve a página inicial do frontend."""
        with open(FRONTEND_PATH / "index.html", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    
    @app.get("/ping")
    async def ping() -> JSONResponse:
        """Endpoint de health check."""
        return JSONResponse({"status": "ok", "message": "Backend is running"})
    
    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def api_proxy(request: Request, path: str) -> JSONResponse:
        """
        Proxy genérico para API Waha.
        Encaminha todas as requisições /api/* para o Waha.
        """
        return await proxy_request(request, path)
    
    @app.websocket("/ws/{phone}")
    async def websocket_endpoint(websocket: WebSocket, phone: str) -> None:
        """
        Endpoint WebSocket para eventos em tempo real.
        
        Args:
            websocket: Conexão WebSocket
            phone: Identificador do telefone/sessão
        """
        await manager.connect(websocket, phone)
        await manager.keep_alive(websocket, phone)
    
    @app.post("/webhook")
    async def webhook(request: Request) -> JSONResponse:
        """
        Handler genérico para webhooks do Waha.
        Processa eventos e faz broadcast via WebSocket.
        """
        return await handle_webhook(request)
    
    @app.post("/webhook/{event_type}")
    async def webhook_event(request: Request, event_type: str) -> JSONResponse:
        """
        Handler para webhooks específicos (compatibilidade).
        
        Args:
            request: Requisição HTTP
            event_type: Tipo do evento (não usado, mantido para compatibilidade)
        """
        return await handle_webhook(request)

