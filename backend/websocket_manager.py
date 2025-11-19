"""
Gerenciador de conexões WebSocket.
Mantém conexões ativas e permite broadcast de mensagens.
"""

import json
import logging
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Gerencia conexões WebSocket por telefone/sessão."""
    
    def __init__(self) -> None:
        """Inicializa o gerenciador."""
        self._connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, phone: str) -> None:
        """
        Aceita uma nova conexão WebSocket.
        
        Args:
            websocket: Conexão WebSocket
            phone: Identificador do telefone/sessão
        """
        await websocket.accept()
        
        if phone not in self._connections:
            self._connections[phone] = set()
        self._connections[phone].add(websocket)
        
        logger.info(f"WebSocket conectado: {phone}")
    
    async def disconnect(self, websocket: WebSocket, phone: str) -> None:
        """
        Remove uma conexão WebSocket.
        
        Args:
            websocket: Conexão WebSocket a remover
            phone: Identificador do telefone/sessão
        """
        if phone in self._connections:
            self._connections[phone].discard(websocket)
            if not self._connections[phone]:
                del self._connections[phone]
        
        logger.info(f"WebSocket desconectado: {phone}")
    
    async def broadcast(self, data: dict) -> None:
        """
        Envia dados para todas as conexões ativas.
        
        Args:
            data: Dados a serem enviados (serão serializados como JSON)
        """
        if not data:
            logger.warning("Tentativa de broadcast com dados vazios")
            return
        
        try:
            message = json.dumps(data)
        except (TypeError, ValueError) as e:
            logger.error(f"Erro ao serializar dados para broadcast: {e}")
            return
        
        disconnected = []
        total_sent = 0
        
        for phone, connections in list(self._connections.items()):
            for websocket in list(connections):
                try:
                    await websocket.send_text(message)
                    total_sent += 1
                except Exception as e:
                    logger.debug(f"Erro ao enviar para WebSocket {phone}: {e}")
                    disconnected.append((websocket, phone))
        
        # Remove conexões desconectadas
        for websocket, phone in disconnected:
            await self.disconnect(websocket, phone)
        
        if total_sent > 0:
            logger.debug(f"Broadcast enviado para {total_sent} cliente(s)")
    
    async def keep_alive(self, websocket: WebSocket, phone: str) -> None:
        """
        Mantém conexão viva aguardando mensagens.
        
        Args:
            websocket: Conexão WebSocket
            phone: Identificador do telefone/sessão
        """
        try:
            while True:
                await websocket.receive_text()  # Keepalive
        except WebSocketDisconnect:
            await self.disconnect(websocket, phone)


# Instância global do gerenciador
manager = WebSocketManager()

