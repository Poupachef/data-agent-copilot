/**
 * Módulo de manipulação da interface.
 * Controla exibição de telas, notificações e atualizações de UI.
 */

console.log('📱 ui.js carregando...');

/**
 * Namespace de UI.
 */
const UI = {
    /**
     * Exibe notificação na tela.
     */
    notify(msg, type = 'info') {
        const div = document.createElement('div');
        div.textContent = msg;
        div.className = `notification ${type}`;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    },

    /**
     * Atualiza texto de status.
     */
    updateStatus(message) {
        const statusEl = document.getElementById('session-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.display = 'block';
        }
    },

    /**
     * Atualiza informações da sessão na UI.
     */
    updateSessionInfo(data) {
        const sessionControls = document.getElementById('session-controls');
        const sessionState = document.getElementById('session-state');
        const sessionUser = document.getElementById('session-user');
        const sessionEngine = document.getElementById('session-engine');
        
        if (sessionControls) {
            sessionControls.style.display = 'block';
        }
        
        if (sessionState) {
            sessionState.textContent = data.status || 'Desconhecido';
            sessionState.className = '';
            sessionState.style.padding = '4px 8px';
            sessionState.style.borderRadius = '4px';
            sessionState.style.fontSize = '12px';
            sessionState.style.fontWeight = 'bold';
            
            const statusColors = {
                'WORKING': ['#28a745', 'white'],
                'AUTHENTICATED': ['#28a745', 'white'],
                'STARTING': ['#ffc107', '#212529'],
                'STOPPED': ['#dc3545', 'white'],
                'FAILED': ['#e74c3c', 'white']
            };
            
            const [bg, color] = statusColors[data.status] || ['#6c757d', 'white'];
            sessionState.style.backgroundColor = bg;
            sessionState.style.color = color;
        }
        
        if (sessionUser && data.me) {
            sessionUser.textContent = data.me.pushName || data.me.id || '-';
        }
        
        if (sessionEngine && data.engine) {
            sessionEngine.textContent = `${data.engine.engine} (${data.engine.state})`;
        }
    },

    /**
     * Atualiza status da sessão na UI de gerenciamento.
     */
    updateSessionStatus(session) {
        const currentSessionStatus = document.getElementById('current-session-status');
        const activeSessionName = document.getElementById('active-session-name');
        
        if (session && session.status) {
            if (currentSessionStatus) {
                currentSessionStatus.textContent = session.status || 'Desconhecido';
                const statusColors = {
                    'WORKING': '#28a745',
                    'AUTHENTICATED': '#28a745',
                    'SCAN_QR_CODE': '#ffc107',
                    'FAILED': '#dc3545',
                    'STOPPED': '#6c757d'
                };
                currentSessionStatus.style.color = statusColors[session.status] || '#333';
            }
            if (activeSessionName) {
                activeSessionName.textContent = session.name || 'default';
            }
        } else {
            if (currentSessionStatus) {
                currentSessionStatus.textContent = 'Nenhuma sessão';
                currentSessionStatus.style.color = '#6c757d';
            }
            if (activeSessionName) {
                activeSessionName.textContent = '-';
            }
        }
    },

    /**
     * Exibe tela de chat.
     */
    showChat() {
        const loginScreen = document.getElementById('login-screen');
        const chatInterface = document.getElementById('chat-interface');
        const chatHeader = document.querySelector('.chat-header');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (chatInterface) chatInterface.style.display = 'flex';
        if (chatHeader) chatHeader.style.display = 'none';
    },

    /**
     * Exibe tela de login.
     */
    showLogin() {
        const loginScreen = document.getElementById('login-screen');
        const chatInterface = document.getElementById('chat-interface');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (chatInterface) chatInterface.style.display = 'none';
    },

    /**
     * Exibe QR code.
     */
    showQR(qrUrl) {
        const qrCode = document.getElementById('qr-code');
        if (qrCode) {
            qrCode.innerHTML = `<img src="${qrUrl}" alt="QR Code">`;
        }
    },

    /**
     * Inicializa estilos de notificação.
     */
    initNotificationStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                animation: slideIn 0.3s;
            }
            .notification.error { background: #e74c3c; }
            .notification.success { background: #27ae60; }
            .notification.info { background: #3498db; }
            .notification.warning { background: #f39c12; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.UI = UI;
console.log('✅ UI exposto globalmente:', typeof window.UI);
