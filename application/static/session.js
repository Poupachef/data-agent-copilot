/**
 * Módulo de gerenciamento de sessão.
 * Controla criação, status e configuração de sessões.
 */

// Debug condicional
const SESSION_DEBUG = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true' || localStorage.getItem('debug') === 'true';
})();

function sessionDebugLog(...args) {
    if (SESSION_DEBUG) console.log('[SESSION]', ...args);
}

function sessionDebugError(...args) {
    console.error('[SESSION]', ...args);
}

const DEFAULT_SESSION = 'default';

/**
 * Namespace de sessão.
 */
const Session = {
    /**
     * Cria uma nova sessão com webhooks configurados.
     */
    async createSession(phone) {
        try {
            await API.createSession(phone);
        } catch (e) {
            if (e.status !== 422) throw e;
            // Sessão já existe, atualiza configuração
            await API.updateSessionConfig(DEFAULT_SESSION, {
                webhooks: [{
                    url: 'http://host.docker.internal:8001/webhook',
                    events: ['message.any', 'message.ack', 'session.status', 'chat.update']
                }]
            });
        }
    },

    /**
     * Verifica e atualiza status da sessão.
     */
    async checkSessionStatus() {
        try {
            const sessions = await API.listSessions();
            
            if (sessions.length > 0) {
                return sessions[0];
            }
            return { status: 'STOPPED', name: null };
        } catch (error) {
            sessionDebugError('❌ Erro ao verificar status da sessão:', error);
            return { status: 'ERROR', name: null };
        }
    },

    /**
     * Configura webhooks na sessão.
     */
    async configureWebhooks(session = DEFAULT_SESSION) {
        try {
            sessionDebugLog('🔧 Configurando webhooks para sessão:', session);
            const webhookConfig = {
                webhooks: [{
                    url: 'http://host.docker.internal:8001/webhook',
                    events: ['message.any', 'message.ack', 'session.status', 'chat.update']
                }]
            };
            sessionDebugLog('📤 Enviando configuração de webhook:', webhookConfig);
            const result = await API.updateSessionConfig(session, webhookConfig);
            sessionDebugLog('✅ Webhooks configurados com sucesso:', result);
            
            // Verifica se os webhooks foram realmente configurados
            try {
                const sessionInfo = await API.getSessionStatus(session);
                if (sessionInfo.config && sessionInfo.config.webhooks) {
                    sessionDebugLog('✅ Webhooks confirmados na sessão:', sessionInfo.config.webhooks);
                } else {
                    sessionDebugError('⚠️ Webhooks não encontrados na configuração da sessão!');
                }
            } catch (checkError) {
                sessionDebugError('⚠️ Erro ao verificar webhooks:', checkError);
            }
        } catch (e) {
            sessionDebugError('❌ Erro ao configurar webhooks:', e);
            throw e;
        }
    },

    /**
     * Gera QR code para autenticação.
     */
    async generateQRCode(session = DEFAULT_SESSION, phone = '') {
        // Verifica status da sessão
        let status;
        try {
            status = await API.getSessionStatus(session);
        } catch (e) {
            if (e.status === 404) {
                status = { status: 'FAILED' };
            } else {
                throw e;
            }
        }
        
        // Se já está conectado, retorna
        if (status.status === 'WORKING' || status.status === 'AUTHENTICATED') {
            return null;
        }
        
        // Cria sessão se necessário
        if (status.status === 'FAILED' || !status.status) {
            await Session.createSession(phone);
        }
        
        // Inicia sessão se parada
        if (status.status === 'STOPPED') {
            await API.startSession(session);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Obtém QR code
        const blob = await API.getQRCode(session);
        return URL.createObjectURL(blob);
    },

    /**
     * Inicia uma sessão.
     */
    async startSession(session = DEFAULT_SESSION) {
        await Session.configureWebhooks(session);
        await API.startSession(session);
    },

    /**
     * Para uma sessão.
     */
    async stopSession(session = DEFAULT_SESSION) {
        await API.stopSession(session);
    },

    /**
     * Faz logout de uma sessão.
     */
    async logout(session = DEFAULT_SESSION) {
        await API.logoutSession(session);
    },

    /**
     * Deleta uma sessão.
     */
    async deleteSession(session = DEFAULT_SESSION) {
        await API.deleteSession(session);
    }
};
