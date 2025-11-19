/**
 * Módulo de gerenciamento WebSocket.
 * Mantém conexão WebSocket e processa eventos em tempo real.
 */

// Configuração do WebSocket - pode ser sobrescrita via window.WS_CONFIG
const WS_BASE = (window.WS_CONFIG && window.WS_CONFIG.baseURL) || 
                `ws://${window.location.host}/ws`;

// Debug condicional
const WS_DEBUG = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true' || localStorage.getItem('debug') === 'true';
})();

function wsDebugLog(...args) {
    if (WS_DEBUG) console.log('[WS]', ...args);
}

function wsDebugError(...args) {
    console.error('[WS]', ...args);
}

let ws = null;
let currentPhone = '';

/**
 * Namespace do WebSocket Manager.
 * Nota: Renomeado para evitar conflito com a classe WebSocket nativa do browser.
 */
const WebSocketManager = {
    /**
     * Conecta ao WebSocket.
     */
    connectWebSocket(phoneNumber, handlers = {}) {
        if (ws) return;
        
        currentPhone = phoneNumber;
        ws = new window.WebSocket(`${WS_BASE}/${phoneNumber}`);
        
        ws.onopen = () => {
            wsDebugLog('✅ WebSocket conectado!');
            if (handlers.onOpen) handlers.onOpen();
        };
        
        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                handleWebSocketMessage(data, handlers);
            } catch (error) {
                wsDebugError('❌ Erro ao processar mensagem WebSocket:', error);
            }
        };
        
        ws.onclose = () => {
            ws = null;
            if (handlers.onClose) handlers.onClose();
            // Reconecta após 5 segundos
            wsDebugLog('Tentando reconectar WebSocket em 5 segundos...');
            setTimeout(() => WebSocketManager.connectWebSocket(currentPhone, handlers), 5000);
        };
        
        ws.onerror = (error) => {
            wsDebugError('❌ WebSocket error:', error);
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

// Expõe globalmente como WebSocketManager para evitar conflito com WebSocket nativo
if (typeof window !== 'undefined') {
    window.WebSocketManager = WebSocket;
    // Mantém compatibilidade com código antigo que usa WebSocket.connectWebSocket
    window.WebSocket = WebSocket;
}

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
            wsDebugLog('📡 Evento não tratado:', event);
    }
}
