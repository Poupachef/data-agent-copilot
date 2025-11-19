"""
Handler para webhooks do Waha.
Recebe eventos e faz broadcast via WebSocket.
"""

import logging
from typing import Any, Dict

from fastapi import Request
from fastapi.responses import JSONResponse

from websocket_manager import manager

logger = logging.getLogger(__name__)


async def handle_webhook(request: Request) -> JSONResponse:
    """
    Processa webhook recebido do Waha.
    
    Args:
        request: Requisição HTTP com dados do webhook
        
    Returns:
        Resposta JSON confirmando recebimento
    """
    try:
        # Valida Content-Type
        content_type = request.headers.get("content-type", "")
        if "application/json" not in content_type:
            logger.warning(f"Content-Type inválido recebido: {content_type}")
            return JSONResponse({"error": "Content-Type must be application/json"}, status_code=400)
        
        data: Dict[str, Any] = await request.json()
        
        # Valida estrutura básica
        if not isinstance(data, dict):
            logger.warning("Webhook recebido não é um objeto JSON válido")
            return JSONResponse({"error": "Invalid JSON structure"}, status_code=400)
        
        event_type: str = data.get("event", "unknown")
        session: str = data.get("session", "unknown")
        
        logger.info(f"Webhook recebido: event={event_type}, session={session}")
        
        # Faz broadcast para todas as conexões WebSocket
        try:
            await manager.broadcast(data)
            logger.debug(f"Webhook broadcast enviado para WebSocket clients")
        except Exception as broadcast_error:
            logger.error(f"Erro ao fazer broadcast do webhook: {broadcast_error}")
            # Não falha o webhook se o broadcast falhar
        
        logger.info(f"Webhook processado com sucesso: {event_type}")
        return JSONResponse({"status": "ok"})
        
    except ValueError as e:
        logger.error(f"Erro ao parsear JSON do webhook: {e}")
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    except Exception as e:
        logger.exception(f"Erro inesperado ao processar webhook: {e}")
        return JSONResponse({"error": "Internal server error"}, status_code=500)

