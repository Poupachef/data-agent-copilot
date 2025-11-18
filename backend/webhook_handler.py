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
        data: Dict[str, Any] = await request.json()
        event_type: str = data.get("event", "unknown")
        
        # Faz broadcast para todas as conexões WebSocket
        await manager.broadcast(data)
        
        logger.info(f"Webhook processado: {event_type}")
        return JSONResponse({"status": "ok"})
        
    except Exception as e:
        logger.error(f"Erro ao processar webhook: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

