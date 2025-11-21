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
        payload = data.get("payload", {})
        
        # Log sempre visível (INFO level) para webhooks recebidos
        logger.info("=" * 60)
        logger.info(f"📨 WEBHOOK RECEBIDO: event={event_type}, session={session}")
        logger.info(f"   Payload keys: {list(payload.keys()) if isinstance(payload, dict) else 'N/A'}")
        
        # Log detalhado para mensagens
        if event_type in ["message", "message.any"]:
            from_field = payload.get("from", "unknown")
            body = payload.get("body", "")
            logger.info(f"💬 MENSAGEM: from={from_field}, body={body[:100]}...")
            logger.info(f"   fromMe: {payload.get('fromMe', 'N/A')}, timestamp: {payload.get('timestamp', 'N/A')}")
        logger.info("=" * 60)
        
        # Faz broadcast para todas as conexões WebSocket
        try:
            active_connections = sum(len(conns) for conns in manager._connections.values())
            logger.info(f"📡 Fazendo broadcast para {active_connections} conexões WebSocket")
            await manager.broadcast(data)
            logger.info(f"✅ Webhook broadcast enviado com sucesso para {active_connections} clientes")
        except Exception as broadcast_error:
            logger.error(f"❌ Erro ao fazer broadcast do webhook: {broadcast_error}")
            # Não falha o webhook se o broadcast falhar
        
        logger.info(f"Webhook processado com sucesso: {event_type}")
        return JSONResponse({"status": "ok"})
        
    except ValueError as e:
        logger.error(f"Erro ao parsear JSON do webhook: {e}")
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)
    except Exception as e:
        logger.exception(f"Erro inesperado ao processar webhook: {e}")
        return JSONResponse({"error": "Internal server error"}, status_code=500)

