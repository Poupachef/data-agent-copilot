/**
 * Aplicação principal WhatsApp Web.
 * Integra todos os módulos e gerencia o fluxo da aplicação.
 */

// Configuração
let phone = localStorage.getItem('phone') || '';
let session = 'default';

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const chatInterface = document.getElementById('chat-interface');
const qrCode = document.getElementById('qr-code');
const phoneInput = document.getElementById('main-phone-input');
const chatList = document.getElementById('chat-list');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');

// Elementos de gerenciamento de sessão
const createSessionBtn = document.getElementById('create-session-btn');
const deleteSessionBtn = document.getElementById('delete-session-btn');
const refreshSessionBtn = document.getElementById('refresh-session-btn');

// Inicialização
phoneInput.value = phone;
phoneInput.oninput = () => {
    phone = phoneInput.value.trim();
    localStorage.setItem('phone', phone);
};

// Inicializa estilos de notificação
UI.initNotificationStyles();

// Handlers de eventos WebSocket
const wsHandlers = {
    onOpen: () => {
        console.log('✅ WebSocket conectado!');
    },
    onClose: () => {
        console.log('🔌 WebSocket desconectado');
    },
    onError: (error) => {
        console.error('❌ WebSocket error:', error);
    },
    onAuthFailure: () => {
        UI.showLogin();
        UI.notify('Falha na autenticação', 'error');
    },
    onQR: (qr) => {
        UI.showQR(qr);
        UI.notify('QR Code atualizado', 'info');
    },
    onReady: () => {
        UI.showChat();
        UI.notify('WhatsApp conectado!', 'success');
        loadChats();
    },
    onMessage: (payload) => {
        handleNewMessage(payload);
    },
    onMessageAck: (ackData) => {
        console.log('Confirmação de mensagem:', ackData);
    },
    onChatUpdate: (chatData) => {
        console.log('Chat atualizado:', chatData);
        loadChats();
    }
};

// Gerenciamento de sessão
async function createSession() {
    try {
        UI.updateStatus('Criando sessão...');
        await Session.createSession(phone);
        UI.notify('✅ Sessão criada!', 'success');
        await checkSessionStatus();
    } catch (error) {
        console.error('❌ Erro ao criar sessão:', error);
        UI.notify(`❌ Erro ao criar sessão: ${error.message}`, 'error');
    }
}

async function deleteSession() {
    try {
        UI.updateStatus('Deletando sessão...');
        await Session.deleteSession(session);
        UI.notify('✅ Sessão deletada!', 'success');
        await checkSessionStatus();
    } catch (error) {
        console.error('❌ Erro ao deletar sessão:', error);
        UI.notify(`❌ Erro ao deletar sessão: ${error.message}`, 'error');
    }
}

async function checkSessionStatus() {
    try {
        const sessionData = await Session.checkSessionStatus();
        UI.updateSessionStatus(sessionData);
    } catch (error) {
        console.error('❌ Erro ao verificar status da sessão:', error);
        UI.updateSessionStatus({ status: 'ERROR', name: null });
    }
}

// Autenticação
async function generateQR() {
    if (!phone) {
        UI.notify('Digite seu telefone', 'warning');
        return;
    }
    
    try {
        UI.updateStatus('Gerando QR Code...');
        const qrUrl = await Session.generateQRCode(session, phone);
        if (qrUrl) {
            UI.showQR(qrUrl);
            UI.updateStatus('QR Code pronto! Escaneie com seu WhatsApp');
            UI.notify('QR Code gerado!', 'success');
        } else {
            // Já está conectado
            const status = await API.getSessionStatus(session);
            UI.updateSessionInfo(status);
        }
    } catch (error) {
        UI.updateStatus('Erro: ' + error.message);
        UI.notify('Erro ao gerar QR', 'error');
    }
}

async function startSession() {
    try {
        UI.updateStatus('Iniciando sessão...');
        await Session.startSession(session);
        UI.notify('Sessão iniciada', 'success');
        await checkStatus();
    } catch (error) {
        UI.notify('Erro ao iniciar sessão: ' + error.message, 'error');
    }
}

async function stopSession() {
    try {
        UI.updateStatus('Parando sessão...');
        await Session.stopSession(session);
        UI.notify('Sessão parada', 'success');
        await checkStatus();
    } catch (error) {
        UI.notify('Erro ao parar sessão: ' + error.message, 'error');
    }
}

async function logout() {
    try {
        await Session.logout(session);
        UI.showLogin();
        UI.notify('Logout completo realizado', 'success');
    } catch (error) {
        UI.notify('Erro no logout: ' + error.message, 'error');
    }
}

async function checkStatus() {
    try {
        let data;
        try {
            data = await API.getSessionStatus(session);
        } catch (e) {
            if (e.status === 404) {
                data = { status: 'STOPPED' };
            } else {
                throw e;
            }
        }
        
        UI.updateStatus(data.status);
        UI.updateSessionInfo(data);
        
        if (data.status === 'WORKING' || data.status === 'AUTHENTICATED') {
            console.log('✅ Status conectado');
        } else if (data.status === 'SCAN_QR_CODE') {
            console.log('📱 Status aguardando QR code...');
            try {
                const qrData = await API.getQRCode(session);
                const qrUrl = URL.createObjectURL(qrData);
                UI.showQR(qrUrl);
            } catch (e) {
                console.error('Erro ao obter QR code:', e);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        UI.updateStatus('Erro ao verificar status');
    }
}

// Chats e mensagens
async function loadChats() {
    try {
        const chats = await Chat.loadChats();
        chatList.innerHTML = Chat.renderChats(chats, 'selectChat');
    } catch (error) {
        UI.notify('Erro ao carregar chats', 'error');
    }
}

async function selectChat(chatId) {
    Chat.setCurrentChat(chatId);
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    event?.target?.closest('.chat-item')?.classList.add('active');
    
    document.getElementById('no-chat-selected').style.display = 'none';
    chatMessages.style.display = 'flex';
    document.getElementById('message-input-container').style.display = 'flex';
    
    try {
        const messages = await API.getMessages(session, chatId);
        renderMessages(messages);
    } catch (error) {
        UI.notify('Erro ao carregar mensagens', 'error');
    }
}

function renderMessages(messages) {
    chatMessages.innerHTML = messages.map(msg => Chat.createMessageHtml(msg)).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    if (!Chat.getCurrentChat() || !messageInput.value.trim()) return;
    
    const message = messageInput.value.trim();
    messageInput.value = '';
    
    try {
        await Chat.sendMessage(message);
    } catch (error) {
        UI.notify('Erro ao enviar mensagem', 'error');
    }
}

function handleNewMessage(messageData) {
    const chatId = messageData.from;
    const currentChatId = Chat.getCurrentChat();
    
    if (currentChatId && chatId === currentChatId) {
        const messageObj = {
            body: messageData.body,
            fromMe: messageData.fromMe,
            timestamp: messageData.timestamp,
            hasMedia: messageData.hasMedia,
            media: messageData.media
        };
        
        const messageHtml = Chat.createMessageHtml(messageObj);
        chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    loadChats();
}

// UI
function showChat() {
    UI.showChat();
    WebSocket.connectWebSocket(phone, wsHandlers);
    loadChats();
}

function showLogin() {
    UI.showLogin();
    WebSocket.disconnectWebSocket();
}

function showSessionSettings() {
    UI.showLogin();
    checkStatus();
    UI.notify('Tela de configurações da sessão', 'info');
}

// Busca
document.getElementById('search-input').oninput = (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.chat-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
};

// Event listeners
document.getElementById('generate-qr-btn').onclick = generateQR;
document.getElementById('start-session-btn').onclick = startSession;
document.getElementById('stop-session-btn').onclick = stopSession;
document.getElementById('show-chat-btn').onclick = showChat;
document.getElementById('session-settings-btn').onclick = showSessionSettings;
document.getElementById('logout-btn').onclick = logout;
document.getElementById('send-btn').onclick = sendMessage;

createSessionBtn.onclick = createSession;
deleteSessionBtn.onclick = deleteSession;
refreshSessionBtn.onclick = checkSessionStatus;

messageInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    UI.showLogin();
    
    const sessionControls = document.getElementById('session-controls');
    if (sessionControls) {
        sessionControls.style.display = 'block';
    }
    
    checkSessionStatus();
    
    if (phone) {
        checkStatus();
    }
});
