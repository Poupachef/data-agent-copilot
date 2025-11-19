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
        index_file = FRONTEND_PATH / "index.html"
        if not index_file.exists():
            logger.error(f"Arquivo index.html não encontrado em {FRONTEND_PATH}")
            return HTMLResponse(content="<h1>Frontend não encontrado</h1>", status_code=500)
        
        try:
            with open(index_file, encoding="utf-8") as f:
                return HTMLResponse(content=f.read())
        except Exception as e:
            logger.error(f"Erro ao ler index.html: {e}")
            return HTMLResponse(content="<h1>Erro ao carregar frontend</h1>", status_code=500)
    
    @app.get("/ping")
    async def ping() -> JSONResponse:
        """Endpoint de health check."""
        return JSONResponse({"status": "ok", "message": "Backend is running"})
    
    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def api_proxy(request: Request, path: str) -> JSONResponse:
        """
        Proxy genérico para API Waha.
        Encaminha todas as requisições /api/* para o Waha.
        """
        # Responde OPTIONS diretamente (preflight CORS)
        if request.method == "OPTIONS":
            return JSONResponse(
                content={},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        return await proxy_request(request, path)
    
    @app.websocket("/ws/{phone}")
    async def websocket_endpoint(websocket: WebSocket, phone: str) -> None:
        """
        Endpoint WebSocket para eventos em tempo real.
        
        Args:
            websocket: Conexão WebSocket
            phone: Identificador do telefone/sessão
        """
        if not phone or not phone.strip():
            logger.warning("Tentativa de conexão WebSocket com phone vazio")
            await websocket.close(code=1008, reason="Invalid phone identifier")
            return
        
        try:
            await manager.connect(websocket, phone)
            await manager.keep_alive(websocket, phone)
        except Exception as e:
            logger.error(f"Erro no WebSocket endpoint para {phone}: {e}")
            try:
                await websocket.close(code=1011, reason="Internal server error")
            except Exception:
                pass
    
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

