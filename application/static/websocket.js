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

// Preserva a classe WebSocket nativa antes de qualquer sobrescrita
const NativeWebSocket = typeof window !== 'undefined' ? window.WebSocket : null;

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
        // Usa a classe WebSocket nativa preservada (antes da sobrescrita)
        if (!NativeWebSocket) {
            wsDebugError('❌ Classe WebSocket nativa não encontrada!');
            return;
        }
        wsDebugLog('🔌 Conectando WebSocket para:', phoneNumber, 'URL:', `${WS_BASE}/${phoneNumber}`);
        ws = new NativeWebSocket(`${WS_BASE}/${phoneNumber}`);
        
        ws.onopen = () => {
            wsDebugLog('✅ WebSocket conectado!');
            if (handlers.onOpen) handlers.onOpen();
        };
        
        ws.onmessage = (e) => {
            try {
                wsDebugLog('📨 Mensagem WebSocket recebida (raw):', e.data);
                const data = JSON.parse(e.data);
                wsDebugLog('📨 Mensagem WebSocket parseada:', data);
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
        if (!NativeWebSocket) return false;
        return ws && ws.readyState === NativeWebSocket.OPEN;
    }
};

// Expõe globalmente como WebSocketManager para evitar conflito com WebSocket nativo
if (typeof window !== 'undefined') {
    // Preserva a classe nativa antes de sobrescrever
    const OriginalWebSocket = window.WebSocket;
    
    window.WebSocketManager = WebSocketManager;
    // Mantém compatibilidade com código antigo que usa WebSocket.connectWebSocket
    window.WebSocket = WebSocketManager;
    // Preserva acesso à classe nativa
    window.WebSocket.Native = OriginalWebSocket;
    
    if (WS_DEBUG) wsDebugLog('✅ WebSocketManager exposto globalmente');
}

/**
 * Processa mensagem recebida via WebSocket.
 */
function handleWebSocketMessage(data, handlers) {
    const event = data.event;
    wsDebugLog('🔔 Processando evento WebSocket:', event, 'Payload:', data.payload);
    
    switch (event) {
        case 'auth_failure':
            wsDebugLog('🔴 Auth failure detectado');
            if (handlers.onAuthFailure) handlers.onAuthFailure();
            break;
        case 'qr':
            wsDebugLog('📱 QR code recebido');
            if (handlers.onQR) handlers.onQR(data.qr);
            break;
        case 'ready':
            wsDebugLog('✅ Ready recebido');
            if (handlers.onReady) handlers.onReady();
            break;
        case 'message':
        case 'message.any':
            wsDebugLog('💬 Mensagem recebida via WebSocket!', data.payload);
            if (handlers.onMessage) {
                wsDebugLog('📤 Chamando handler onMessage...');
                handlers.onMessage(data.payload);
            } else {
                wsDebugError('⚠️ Handler onMessage não encontrado!');
            }
            break;
        case 'message.ack':
            wsDebugLog('✓ Confirmação de mensagem recebida');
            if (handlers.onMessageAck) handlers.onMessageAck(data.payload);
            break;
        case 'chat.update':
            wsDebugLog('🔄 Chat atualizado via WebSocket');
            wsDebugLog('   Payload do chat.update:', data.payload);
            if (handlers.onChatUpdate) {
                handlers.onChatUpdate(data.payload);
            } else {
                wsDebugError('⚠️ Handler onChatUpdate não encontrado!');
            }
            break;
        default:
            wsDebugLog('📡 Evento não tratado:', event, 'Dados completos:', data);
    }
}
