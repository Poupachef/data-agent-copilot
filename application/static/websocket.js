/**
 * Módulo de gerenciamento WebSocket.
 * Mantém conexão WebSocket e processa eventos em tempo real.
 */

const WS_BASE = 'ws://localhost:8001/ws';

let ws = null;
let currentPhone = '';

/**
 * Namespace do WebSocket.
 */
const WebSocket = {
    /**
     * Conecta ao WebSocket.
     */
    connectWebSocket(phoneNumber, handlers = {}) {
        if (ws) return;
        
        currentPhone = phoneNumber;
        ws = new window.WebSocket(`${WS_BASE}/${phoneNumber}`);
        
        ws.onopen = () => {
            console.log('✅ WebSocket conectado!');
            if (handlers.onOpen) handlers.onOpen();
        };
        
        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                handleWebSocketMessage(data, handlers);
            } catch (error) {
                console.error('❌ Erro ao processar mensagem WebSocket:', error);
            }
        };
        
        ws.onclose = () => {
            ws = null;
            if (handlers.onClose) handlers.onClose();
            // Reconecta após 5 segundos
            setTimeout(() => WebSocket.connectWebSocket(currentPhone, handlers), 5000);
        };
        
        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            if (handlers.onError) handlers.onError(error);
        };
    },

    /**
     * Desconecta do WebSocket.
     */
    disconnectWebSocket() {
        if (ws) {
            ws.close();
            ws = null;
        }
    },

    /**
     * Verifica se WebSocket está conectado.
     */
    isConnected() {
        return ws && ws.readyState === window.WebSocket.OPEN;
    }
};

/**
 * Processa mensagem recebida via WebSocket.
 */
function handleWebSocketMessage(data, handlers) {
    const event = data.event;
    
    switch (event) {
        case 'auth_failure':
            if (handlers.onAuthFailure) handlers.onAuthFailure();
            break;
        case 'qr':
            if (handlers.onQR) handlers.onQR(data.qr);
            break;
        case 'ready':
            if (handlers.onReady) handlers.onReady();
            break;
        case 'message':
        case 'message.any':
            if (handlers.onMessage) handlers.onMessage(data.payload);
            break;
        case 'message.ack':
            if (handlers.onMessageAck) handlers.onMessageAck(data.payload);
            break;
        case 'chat.update':
            if (handlers.onChatUpdate) handlers.onChatUpdate(data.payload);
            break;
        default:
            console.log('📡 Evento não tratado:', event);
    }
}
