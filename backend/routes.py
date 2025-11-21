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
from favorites import add_favorite, get_favorites, is_favorite, remove_favorite
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
    
    # Endpoints de favoritos (DEVEM VIR ANTES do proxy genérico)
    @app.get("/api/favorites/{session}")
    async def get_user_favorites(session: str) -> JSONResponse:
        """
        Obtém lista de favoritos de uma sessão.
        
        Args:
            session: Nome da sessão
            
        Returns:
            Lista de IDs de chats favoritos
        """
        try:
            favorites = get_favorites(session)
            return JSONResponse({"favorites": favorites})
        except Exception as e:
            logger.error(f"Erro ao obter favoritos para sessão {session}: {e}")
            return JSONResponse({"error": str(e)}, status_code=500)
    
    @app.post("/api/favorites/{session}/{chat_id:path}")
    async def add_user_favorite(session: str, chat_id: str) -> JSONResponse:
        """
        Adiciona um chat aos favoritos de uma sessão.
        
        Args:
            session: Nome da sessão
            chat_id: ID do chat (pode conter /, por isso :path)
            
        Returns:
            Status da operação
        """
        try:
            # Decodifica o chat_id se necessário
            decoded_chat_id = chat_id.replace("%40", "@")
            success = add_favorite(session, decoded_chat_id)
            if success:
                return JSONResponse({"success": True, "message": "Favorito adicionado"})
            return JSONResponse({"success": False, "error": "Erro ao adicionar favorito"}, status_code=500)
        except Exception as e:
            logger.error(f"Erro ao adicionar favorito para sessão {session}, chat {chat_id}: {e}")
            return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    
    @app.delete("/api/favorites/{session}/{chat_id:path}")
    async def remove_user_favorite(session: str, chat_id: str) -> JSONResponse:
        """
        Remove um chat dos favoritos de uma sessão.
        
        Args:
            session: Nome da sessão
            chat_id: ID do chat (pode conter /, por isso :path)
            
        Returns:
            Status da operação
        """
        try:
            # Decodifica o chat_id se necessário
            decoded_chat_id = chat_id.replace("%40", "@")
            success = remove_favorite(session, decoded_chat_id)
            if success:
                return JSONResponse({"success": True, "message": "Favorito removido"})
            return JSONResponse({"success": False, "error": "Erro ao remover favorito"}, status_code=500)
        except Exception as e:
            logger.error(f"Erro ao remover favorito para sessão {session}, chat {chat_id}: {e}")
            return JSONResponse({"success": False, "error": str(e)}, status_code=500)
    
    @app.get("/api/favorites/{session}/{chat_id:path}/check")
    async def check_favorite(session: str, chat_id: str) -> JSONResponse:
        """
        Verifica se um chat é favorito de uma sessão.
        
        Args:
            session: Nome da sessão
            chat_id: ID do chat (pode conter /, por isso :path)
            
        Returns:
            True se é favorito, False caso contrário
        """
        try:
            # Decodifica o chat_id se necessário
            decoded_chat_id = chat_id.replace("%40", "@")
            is_fav = is_favorite(session, decoded_chat_id)
            return JSONResponse({"isFavorite": is_fav})
        except Exception as e:
            logger.error(f"Erro ao verificar favorito para sessão {session}, chat {chat_id}: {e}")
            return JSONResponse({"isFavorite": False, "error": str(e)}, status_code=500)
    
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

