// WhatsApp Web - Essencial
const API = 'http://localhost:8001/api';
const WS = 'ws://localhost:8001/ws';

let phone = localStorage.getItem('phone') || '';
let currentChat = null;
let ws = null;
let session = 'default';

// Elements
const loginScreen = document.getElementById('login-screen');
const chatInterface = document.getElementById('chat-interface');
const qrCode = document.getElementById('qr-code');
const phoneInput = document.getElementById('main-phone-input');
const chatList = document.getElementById('chat-list');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');

// Session management elements
const createSessionBtn = document.getElementById('create-session-btn');
const deleteSessionBtn = document.getElementById('delete-session-btn');
const refreshSessionBtn = document.getElementById('refresh-session-btn');
const currentSessionStatus = document.getElementById('current-session-status');
const activeSessionName = document.getElementById('active-session-name');

// Initialize
phoneInput.value = phone;
phoneInput.oninput = () => {
    phone = phoneInput.value.trim();
    localStorage.setItem('phone', phone);
};

// API helper
async function api(endpoint, options = {}) {
    const response = await fetch(`${API}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
        const error = new Error(data.message || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
    }
    
    return data;
}

// Notifications
function notify(msg, type = 'info') {
    const div = document.createElement('div');
    div.textContent = msg;
    div.className = `notification ${type}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// Session Management
async function createSession() {
    try {
        updateStatus('Criando sessão...');
        
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
        
        await api('/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionConfig)
        });
        
        notify('✅ Sessão criada!', 'success');
        await checkSessionStatus();
        
    } catch (error) {
        console.error('❌ Erro ao criar sessão:', error);
        notify(`❌ Erro ao criar sessão: ${error.message}`, 'error');
    }
}

async function deleteSession() {
    try {
        updateStatus('Deletando sessão...');
        await api(`/sessions/${session}`, { method: 'DELETE' });
        notify('✅ Sessão deletada!', 'success');
        await checkSessionStatus();
    } catch (error) {
        console.error('❌ Erro ao deletar sessão:', error);
        notify(`❌ Erro ao deletar sessão: ${error.message}`, 'error');
    }
}

async function checkSessionStatus() {
    try {
        const sessions = await api('/sessions');
        
        if (sessions.length > 0) {
            const activeSession = sessions[0];
            currentSessionStatus.textContent = activeSession.status || 'Desconhecido';
            activeSessionName.textContent = activeSession.name || 'default';
            
            const statusColors = {
                'WORKING': '#28a745', 'AUTHENTICATED': '#28a745',
                'SCAN_QR_CODE': '#ffc107', 'FAILED': '#dc3545', 'STOPPED': '#6c757d'
            };
            currentSessionStatus.style.color = statusColors[activeSession.status] || '#333';
        } else {
            currentSessionStatus.textContent = 'Nenhuma sessão';
            activeSessionName.textContent = '-';
            currentSessionStatus.style.color = '#6c757d';
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar status da sessão:', error);
        currentSessionStatus.textContent = 'Erro';
        activeSessionName.textContent = '-';
        currentSessionStatus.style.color = '#dc3545';
    }
}

// Auth
async function generateQR() {
    if (!phone) return notify('Digite seu telefone');
    
    try {
        updateStatus('Verificando sessão...');
        
        // Tentar obter status da sessão
        let status;
        try {
            status = await api(`/sessions/${session}`);
        } catch (e) {
            // Se a sessão não existe (404), criar uma nova
            if (e.status === 404) {
                console.log('ℹ️ Sessão não existe, criando nova...');
                status = { status: 'FAILED' };
            } else {
                throw e;
            }
        }
        
        // Se já está conectado, apenas mostrar status
        if (status.status === 'WORKING' || status.status === 'AUTHENTICATED') {
            console.log('✅ Sessão já conectada');
            updateSessionInfo(status);
            return;
        }
        
        if (status.status === 'FAILED' || !status.status) {
            updateStatus('Criando nova sessão...');
            try {
                await api('/sessions', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: session,
                        config: {
                            webhooks: [{
                                url: 'http://host.docker.internal:8001/webhook',
                                events: ['message.any', 'message.ack', 'session.status']
                            }]
                        }
                    })
                });
                console.log('✅ Sessão criada com webhooks configurados');
            } catch (e) {
                if (e.status !== 422) throw e;
                console.log('ℹ️ Sessão já existe, configurando webhooks...');
                
                await api(`/sessions/${session}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        config: {
                            webhooks: [{
                                url: 'http://host.docker.internal:8001/webhook',
                                events: ['message.any', 'message.ack', 'session.status']
                            }]
                        }
                    })
                });
                console.log('✅ Webhooks configurados na sessão existente');
            }
        }
        
        if (status.status === 'STOPPED') {
            updateStatus('Iniciando sessão...');
            await api(`/sessions/${session}/start`, { method: 'POST' });
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        updateStatus('Gerando QR Code...');
        
        try {
            const response = await fetch(`${API}/${session}/auth/qr`);
            if (response.ok) {
                const blob = await response.blob();
                const qrUrl = URL.createObjectURL(blob);
                showQR(qrUrl);
                updateStatus('QR Code pronto! Escaneie com seu WhatsApp');
                notify('QR Code gerado!', 'success');
            } else {
                updateStatus('Erro ao gerar QR');
                notify('QR não disponível', 'error');
            }
        } catch (e) {
            updateStatus('Erro: ' + e.message);
            notify('Erro ao gerar QR', 'error');
        }
    } catch (e) {
        updateStatus('Erro: ' + e.message);
        notify('Erro ao gerar QR', 'error');
    }
}

async function startSession() {
    try {
        updateStatus('Iniciando sessão...');
        
        try {
            await api(`/sessions/${session}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        webhooks: [{
                            url: 'http://host.docker.internal:8001/webhook',
                            events: ['message.any', 'message.ack', 'session.status']
                        }]
                    }
                })
            });
            console.log('✅ Webhooks configurados');
        } catch (e) {
            console.log('⚠️ Erro ao configurar webhooks:', e.message);
        }
        
        await api(`/sessions/${session}/start`, { method: 'POST' });
        notify('Sessão iniciada', 'success');
        await checkStatus();
    } catch (e) {
        notify('Erro ao iniciar sessão: ' + e.message, 'error');
    }
}

async function stopSession() {
    try {
        updateStatus('Parando sessão...');
        await api(`/sessions/${session}/stop`, { method: 'POST' });
        notify('Sessão parada', 'success');
        await checkStatus();
    } catch (e) {
        notify('Erro ao parar sessão: ' + e.message, 'error');
    }
}

async function logout() {
    try {
        await api(`/sessions/${session}/logout`, { method: 'POST' });
        showLogin();
        notify('Logout completo realizado', 'success');
    } catch (e) {
        notify('Erro no logout: ' + e.message, 'error');
    }
}

async function checkStatus() {
    try {
        console.log('🔍 Verificando status da sessão...');
        
        // Tentar obter status da sessão
        let data;
        try {
            data = await api(`/sessions/${session}`);
        } catch (e) {
            // Se a sessão não existe (404), mostrar como STOPPED
            if (e.status === 404) {
                console.log('ℹ️ Sessão não existe');
                data = { status: 'STOPPED' };
            } else {
                throw e;
            }
        }
        
        console.log('📊 Status recebido:', data.status);
        updateStatus(data.status);
        
        // Atualizar informações da sessão
        updateSessionInfo(data);
        
        if (data.status === 'WORKING' || data.status === 'AUTHENTICATED') {
            console.log('✅ Status conectado');
        } else if (data.status === 'SCAN_QR_CODE') {
            console.log('📱 Status aguardando QR code...');
            const qrData = await api(`/${session}/auth/qr`);
            if (qrData.qr) showQR(qrData.qr);
        } else {
            console.log('📊 Status atual:', data.status);
        }
    } catch (e) {
        console.error('❌ Erro ao verificar status:', e);
        updateStatus('Erro ao verificar status');
    }
}

function updateStatus(message) {
    const statusEl = document.getElementById('session-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.display = 'block';
    }
}

function updateSessionInfo(data) {
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
            'WORKING': ['#28a745', 'white'], 'AUTHENTICATED': ['#28a745', 'white'],
            'STARTING': ['#ffc107', '#212529'], 'STOPPED': ['#dc3545', 'white'],
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
}

// UI
function showChat() {
    loginScreen.style.display = 'none';
    chatInterface.style.display = 'flex';
    
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) chatHeader.style.display = 'none';
    
    connectWS();
    loadChats();
}

function showLogin() {
    loginScreen.style.display = 'flex';
    chatInterface.style.display = 'none';
    if (ws) {
        ws.close();
        ws = null;
    }
}

function showSessionSettings() {
    // Voltar para a tela de login mas manter a sessão ativa
    loginScreen.style.display = 'flex';
    chatInterface.style.display = 'none';
    
    // Verificar status atual da sessão
    checkStatus();
    
    notify('Tela de configurações da sessão', 'info');
}

function showQR(qr) {
    qrCode.innerHTML = `<img src="${qr}" alt="QR Code">`;
}

// Chats
async function loadChats() {
    try {
        const data = await api('/default/chats/overview');
        renderChats(data);
    } catch (e) {
        notify('Erro ao carregar chats', 'error');
    }
}

function getAckIcon(ack, fromMe) {
    if (!fromMe) return '';
    if (ack === 1) return '<span class="msg-ack">&#10003;</span>'; // ✓
    if (ack === 2) return '<span class="msg-ack">&#10003;&#10003;</span>'; // ✓✓
    if (ack === 3) return '<span class="msg-ack msg-ack-read">&#10003;&#10003;</span>'; // ✓✓ azul
    return '';
}

function renderChats(chats) {
    chatList.innerHTML = chats.map(chat => {
        const chatId = chat.id._serialized || chat.id;
        if (!chatId) return '';

        const name = chat.name || chatId.split('@')[0] || 'Desconhecido';
        const lastMsg = chat.lastMessage;
        const lastMsgText = lastMsg?.body || '';
        const lastMsgTime = lastMsg?.timestamp
            ? new Date(lastMsg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '';
        const unread = chat.unreadCount > 0
            ? `<span class="unread-badge">${chat.unreadCount}</span>`
            : '';
        const ackIcon = getAckIcon(lastMsg?.ack, lastMsg?.fromMe);

        return `
            <div class="chat-item" onclick="selectChat('${chatId}')">
                <div class="chat-avatar">
                    <div class="avatar-placeholder">👤</div>
                </div>
                <div class="chat-info">
                    <div class="chat-header">
                        <div class="chat-name">${name}</div>
                        <div class="chat-time">${lastMsgTime}</div>
                    </div>
                    <div class="chat-preview">
                        <div class="chat-message">
                            ${ackIcon}
                            ${lastMsgText}
                        </div>
                        ${unread}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Utility functions
function formatMessageTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('pt-BR');
}

function renderMediaHtml(media) {
    if (!media || !media.url) return '';
    
    // Corrigir a URL para passar pelo backend
    const mediaUrl = media.url.replace('http://localhost:3000', 'http://localhost:8001');
    
    if (media.mimetype && media.mimetype.startsWith('image/')) {
        return `<div class="message-media"><img src="${mediaUrl}" alt="Image" onerror="this.style.display='none'"></div>`;
    } else {
        return `<div class="message-media"><div class="media-placeholder">📎 ${media.filename || 'Arquivo'}</div></div>`;
    }
}

function createMessageHtml(message) {
    const messageText = message.body || message.text || '';
    const time = message.timestamp ? formatMessageTime(message.timestamp) : '';
    const hasMedia = message.hasMedia && message.media && message.media.url;
    const mediaHtml = hasMedia ? renderMediaHtml(message.media) : '';
    
    return `
        <div class="message ${message.fromMe ? 'sent' : 'received'}">
            <div class="message-content">
                ${mediaHtml}
                ${messageText ? `<div class="message-text">${messageText}</div>` : ''}
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
}

// Messages
async function selectChat(chatId) {
    currentChat = chatId;
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    event?.target?.closest('.chat-item')?.classList.add('active');
    
    document.getElementById('no-chat-selected').style.display = 'none';
    chatMessages.style.display = 'flex';
    document.getElementById('message-input-container').style.display = 'flex';
    
    try {
        const data = await api(`/default/chats/${encodeURIComponent(chatId)}/messages?limit=40`);
        renderMessages(data);
    } catch (e) {
        notify('Erro ao carregar mensagens', 'error');
    }
}

function renderMessages(messages) {
    // Debug: verificar ordem das mensagens
    console.log('📱 Mensagens recebidas via API:', messages.length);
    console.log('mais antigas primeiro');
    if (messages.length > 0) {
        console.log('📱 Primeira mensagem:', messages[0].timestamp, new Date(messages[0].timestamp * 1000));
        console.log('📱 Última mensagem:', messages[messages.length - 1].timestamp, new Date(messages[messages.length - 1].timestamp * 1000));
    }
    
    // As mensagens já vêm na ordem correta (mais antigas primeiro)
    chatMessages.innerHTML = messages.map(msg => createMessageHtml(msg)).join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
    if (!currentChat || !messageInput.value.trim()) return;
    
    const message = messageInput.value.trim();
    messageInput.value = '';
    
    try {
        await api('/sendText', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chatId: currentChat,
                text: message,
                session: 'default'
            })
        });
        // Não recarregar todas as mensagens - deixar o WebSocket adicionar a nova mensagem
        // await selectChat(currentChat);
    } catch (e) {
        notify('Erro ao enviar mensagem', 'error');
    }
}

// WebSocket
function connectWS() {
    if (ws) return;
    
    ws = new WebSocket(`${WS}/${phone}`);
    
    ws.onopen = () => {
        console.log('✅ WebSocket conectado!');
    };
    
    ws.onmessage = (e) => {
        try {
            console.log('📡 WebSocket message recebida:', e.data);
            const data = JSON.parse(e.data);
            console.log('📡 Data parseada:', data);
            console.log('📡 Event:', data.event);
            console.log('📡 Data field:', data.data);
            
            if (data.event === 'auth_failure') {
                showLogin();
                notify('Falha na autenticação', 'error');
            } else if (data.event === 'qr') {
                showQR(data.qr);
                notify('QR Code atualizado', 'info');
            } else if (data.event === 'ready') {
                showChat();
                notify('WhatsApp conectado!', 'success');
            } else if (data.event === 'message' || data.event === 'message.any') {
                handleNewMessage(data.payload);
            } else if (data.event === 'message.ack') {
                handleMessageAck(data.payload);
            } else if (data.event === 'chat.update') {
                handleChatUpdate(data.payload);
            } else {
                console.log('📡 Evento não tratado:', data.event);
            }
        } catch (e) {
            console.error('❌ Erro ao processar WebSocket message:', e);
            console.error('❌ Dados recebidos:', e.data);
        }
    };
    
    ws.onclose = () => {
        ws = null;
        setTimeout(connectWS, 5000);
    };
    
    ws.onerror = (e) => {
        console.error('❌ WebSocket error:', e);
    };
}

// Handlers para eventos WebSocket
function handleNewMessage(messageData) {
    console.log('📨 Nova mensagem recebida:', messageData.body);
    console.log('📨 Estrutura completa:', JSON.stringify(messageData, null, 2));
    
    // Extrair dados da estrutura correta
    const chatId = messageData.from;
    const messageText = messageData.body;
    const isFromMe = messageData.fromMe;
    const timestamp = messageData.timestamp;
    
    console.log('📨 Dados extraídos:');
    console.log('📨 ChatId:', chatId);
    console.log('📨 Texto:', messageText);
    console.log('📨 FromMe:', isFromMe);
    console.log('📨 Timestamp:', timestamp);
    
    // Se estamos no chat correto, adicionar a mensagem
    if (currentChat && chatId === currentChat) {
        // Criar objeto de mensagem com a estrutura esperada
        const messageObj = {
            body: messageText,
            fromMe: isFromMe,
            timestamp: timestamp,
            hasMedia: messageData.hasMedia,
            media: messageData.media
        };
        
        // Usar a mesma função utilitária para criar o HTML
        const messageHtml = createMessageHtml(messageObj);
        chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log('✅ Mensagem adicionada ao chat');
    } else {
        console.log('📨 Mensagem não é para o chat atual');
    }
    
    loadChats();
}

function handleMessageAck(ackData) {
    console.log('Confirmação de mensagem:', ackData);
}

function handleChatUpdate(chatData) {
    console.log('Chat atualizado:', chatData);
    loadChats();
}



// Search
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

// Session management event listeners
createSessionBtn.onclick = createSession;
deleteSessionBtn.onclick = deleteSession;
refreshSessionBtn.onclick = checkSessionStatus;

messageInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showLogin();
    
    // Mostrar os controles da sessão
    const sessionControls = document.getElementById('session-controls');
    if (sessionControls) {
        sessionControls.style.display = 'block';
    }
    
    // Verificar status inicial da sessão
    checkSessionStatus();
    
    // Verificar status inicial (sem conectar automaticamente)
    if (phone) {
        checkStatus();
    }
});

// Notification styles
document.head.insertAdjacentHTML('beforeend', `
<style>
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
</style>
`); 