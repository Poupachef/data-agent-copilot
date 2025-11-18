/**
 * Módulo de comunicação com a API.
 * Centraliza todas as chamadas HTTP ao backend.
 */

const API_BASE = 'http://localhost:8001/api';

/**
 * Faz uma requisição à API.
 */
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
        const error = new Error(data.message || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }
    
    return data;
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
                    events: ['message', 'session.status'],
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
        return await apiRequest(`/${session}/chats/${encodeURIComponent(chatId)}/messages?limit=${limit}`);
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
    }
};
