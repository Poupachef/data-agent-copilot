/**
 * Módulo de comunicação com a API.
 * Centraliza todas as chamadas HTTP ao backend.
 */

// Configuração da API - pode ser sobrescrita via window.API_CONFIG
const API_BASE = (window.API_CONFIG && window.API_CONFIG.baseURL) || 
                 `${window.location.protocol}//${window.location.host}/api`;

// Modo debug - pode ser ativado via window.API_CONFIG.debug
const API_DEBUG = (window.API_CONFIG && window.API_CONFIG.debug) || false;

/**
 * Faz uma requisição à API.
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    if (API_DEBUG) {
        console.log(`[API] ${options.method || 'GET'} ${url}`, options.body ? JSON.parse(options.body) : '');
    }
    
    try {
        const response = await fetch(url, options);
        
        // Tenta parsear JSON, mas trata erros de parse
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (parseError) {
                if (API_DEBUG) {
                    console.error('[API] Erro ao parsear JSON:', parseError);
                }
                throw new Error(`Invalid JSON response: ${response.status}`);
            }
        } else {
            // Se não for JSON, retorna o texto
            data = await response.text();
        }
        
        if (!response.ok) {
            const error = new Error(data.message || data.error || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            if (API_DEBUG) {
                console.error(`[API] Erro ${response.status}:`, error);
            }
            throw error;
        }
        
        if (API_DEBUG) {
            console.log(`[API] Resposta ${response.status}:`, data);
        }
        
        return data;
    } catch (error) {
        // Se for erro de rede, adiciona informação útil
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            const networkError = new Error('Erro de conexão com o servidor. Verifique se o backend está rodando.');
            networkError.status = 0;
            networkError.originalError = error;
            if (API_DEBUG) {
                console.error('[API] Erro de rede:', networkError);
            }
            throw networkError;
        }
        throw error;
    }
}

/**
 * Namespace da API.
 */
const API = {
    /**
     * Cria uma nova sessão.
     */
    async createSession(phone) {
        const sessionConfig = {
            name: "default",
            start: true,
            config: {
                metadata: {
                    "user.id": phone || 'web',
                    "user.email": ''
                },
                proxy: null,
                debug: false,
                ignore: { status: null, groups: null, channels: null },
                noweb: { store: { enabled: true, fullSync: false } },
                webjs: { tagsEventsOn: false },
                webhooks: [{
                    url: 'http://host.docker.internal:8001/webhook',
                    events: ['message.any', 'message.ack', 'session.status'],
                    hmac: null,
                    retries: null,
                    customHeaders: null
                }]
            }
        };
        
        return await apiRequest('/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionConfig)
        });
    },

    /**
     * Deleta uma sessão.
     */
    async deleteSession(session = 'default') {
        return await apiRequest(`/sessions/${session}`, { method: 'DELETE' });
    },

    /**
     * Obtém status de uma sessão.
     */
    async getSessionStatus(session = 'default') {
        try {
            return await apiRequest(`/sessions/${session}`);
        } catch (e) {
            if (e.status === 404) {
                return { status: 'STOPPED' };
            }
            throw e;
        }
    },

    /**
     * Lista todas as sessões.
     */
    async listSessions() {
        return await apiRequest('/sessions');
    },

    /**
     * Inicia uma sessão.
     */
    async startSession(session = 'default') {
        return await apiRequest(`/sessions/${session}/start`, { method: 'POST' });
    },

    /**
     * Para uma sessão.
     */
    async stopSession(session = 'default') {
        return await apiRequest(`/sessions/${session}/stop`, { method: 'POST' });
    },

    /**
     * Faz logout de uma sessão.
     */
    async logoutSession(session = 'default') {
        return await apiRequest(`/sessions/${session}/logout`, { method: 'POST' });
    },

    /**
     * Obtém QR code de autenticação.
     */
    async getQRCode(session = 'default') {
        const response = await fetch(`${API_BASE}/${session}/auth/qr`);
        if (!response.ok) {
            throw new Error('QR code não disponível');
        }
        return await response.blob();
    },

    /**
     * Atualiza configuração de uma sessão.
     */
    async updateSessionConfig(session = 'default', config) {
        return await apiRequest(`/sessions/${session}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config })
        });
    },

    /**
     * Obtém lista de chats.
     */
    async getChats(session = 'default') {
        return await apiRequest(`/${session}/chats/overview`);
    },

    /**
     * Obtém mensagens de um chat.
     */
    async getMessages(session = 'default', chatId, limit = 40) {
        const url = `/${session}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`;
        console.log('[API] 📡 Buscando mensagens:', { session, chatId, limit, url });
        const messages = await apiRequest(url);
        
        // Log de origem das mensagens da API
        console.log('[API] 📥 Mensagens recebidas do backend:', {
            session,
            chatId,
            total: messages?.length || 0,
            source: 'API.getMessages -> apiRequest',
            url: url,
            messages: messages?.map(msg => ({
                id: msg.id,
                hasBody: !!msg.body,
                hasText: !!msg.text,
                hasMedia: !!(msg.hasMedia && msg.media && msg.media.url),
                timestamp: msg.timestamp,
                type: msg.type,
                fullMessage: msg
            })) || []
        });
        
        return messages;
    },

    /**
     * Envia uma mensagem de texto.
     */
    async sendTextMessage(session = 'default', chatId, text) {
        return await apiRequest('/sendText', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chatId,
                text,
                session
            })
        });
    },

    /**
     * Marca mensagens não lidas como lidas em um chat.
     */
    async markMessagesAsRead(session = 'default', chatId) {
        return await apiRequest(`/${session}/chats/${encodeURIComponent(chatId)}/messages/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    },
    
    /**
     * Obtém lista de favoritos de uma sessão.
     */
    async getFavorites(session = 'default') {
        return await apiRequest(`/favorites/${session}`);
    },
    
    /**
     * Adiciona um chat aos favoritos de uma sessão.
     */
    async addFavorite(session = 'default', chatId) {
        return await apiRequest(`/favorites/${session}/${encodeURIComponent(chatId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    },
    
    /**
     * Remove um chat dos favoritos de uma sessão.
     */
    async removeFavorite(session = 'default', chatId) {
        return await apiRequest(`/favorites/${session}/${encodeURIComponent(chatId)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
    },
    
    /**
     * Verifica se um chat é favorito de uma sessão.
     */
    async checkFavorite(session = 'default', chatId) {
        return await apiRequest(`/favorites/${session}/${encodeURIComponent(chatId)}/check`);
    }
};

// Expõe globalmente
if (typeof window !== 'undefined') {
    window.API = API;
}
