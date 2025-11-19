/**
 * Aplicação principal WhatsApp Web.
 * Integra todos os módulos e gerencia o fluxo da aplicação.
 */

console.log('📱 app.js carregado');

// Configuração
let phone = localStorage.getItem('phone') || '';
let session = 'default';

// Elementos DOM (serão inicializados no DOMContentLoaded)
let loginScreen;
let chatInterface;
let qrCode;
let phoneInput;
let chatList;
let chatMessages;
let messageInput;

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
        // Se estiver em modo mockado, apenas desativa o modo
        if (Mock && Mock.isMockMode()) {
            Mock.disableMockMode();
            UI.showLogin();
            UI.notify('Modo mockado desativado', 'success');
        } else {
            await Session.logout(session);
            UI.showLogin();
            UI.notify('Logout completo realizado', 'success');
        }
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

// Modo mockado - função global definida IMEDIATAMENTE
window.startMockMode = function() {
    console.log('=== startMockMode chamado ===');
    console.log('Mock disponível?', typeof Mock !== 'undefined');
    console.log('UI disponível?', typeof UI !== 'undefined');
    console.log('Chat disponível?', typeof Chat !== 'undefined');
    
    // Aguarda um pouco se os módulos ainda não carregaram
    if (typeof Mock === 'undefined' || typeof UI === 'undefined' || typeof Chat === 'undefined') {
        console.log('⏳ Módulos ainda não carregaram, aguardando...');
        setTimeout(() => {
            window.startMockMode();
        }, 500);
        return;
    }
    
    try {
        console.log('Ativando modo mockado...');
        Mock.enableMockMode();
        console.log('Modo mockado ativado no localStorage');
        
        console.log('Mostrando notificação...');
        UI.notify('Modo mockado ativado!', 'success');
        
        console.log('Mostrando chat...');
        // Aguarda um pouco para garantir que as funções estejam disponíveis
        setTimeout(() => {
            if (typeof showChat === 'function' || typeof window.showChat === 'function') {
                (showChat || window.showChat)();
            } else {
                // Fallback direto
                const loginScreen = document.getElementById('login-screen');
                const chatInterface = document.getElementById('chat-interface');
                if (loginScreen) loginScreen.style.display = 'none';
                if (chatInterface) chatInterface.style.display = 'flex';
            }
            
            console.log('Carregando chats...');
            setTimeout(() => {
                if (typeof loadChats === 'function' || typeof window.loadChats === 'function') {
                    (loadChats || window.loadChats)();
                }
            }, 200);
        }, 100);
        
        // Configura handler para novas mensagens mockadas
        window.mockMessageHandler = (message, chatId) => {
            if (typeof Chat !== 'undefined') {
                const currentChatId = Chat.getCurrentChat();
                if (currentChatId && chatId === currentChatId) {
                    const messageHtml = Chat.createMessageHtml(message);
                    const chatMessagesEl = document.getElementById('chat-messages');
                    if (chatMessagesEl) {
                        chatMessagesEl.insertAdjacentHTML('beforeend', messageHtml);
                        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
                    }
                }
                if (typeof loadChats === 'function') {
                    loadChats();
                }
            }
        };
        
        console.log('✅ Modo mockado iniciado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao iniciar modo mockado:', error);
        console.error('Stack trace:', error.stack);
        alert('Erro ao iniciar modo mockado: ' + error.message);
    }
};

console.log('✅ window.startMockMode definida IMEDIATAMENTE:', typeof window.startMockMode);

// Também define como função local para uso interno
function startMockMode() {
    window.startMockMode();
}

// Chats e mensagens
async function loadChats() {
    try {
        const chatListEl = document.getElementById('chat-list');
        if (!chatListEl) {
            console.log('chat-list não encontrado, aguardando...');
            setTimeout(loadChats, 100);
            return;
        }
        
        if (typeof Chat === 'undefined' || !Chat.loadChats) {
            console.log('Chat.loadChats não disponível, aguardando...');
            setTimeout(loadChats, 100);
            return;
        }
        
        const chats = await Chat.loadChats();
        if (Chat.renderChats) {
            chatListEl.innerHTML = Chat.renderChats(chats, 'selectChat');
        }
    } catch (error) {
        console.error('Erro ao carregar chats:', error);
        if (typeof UI !== 'undefined' && UI.notify) {
            UI.notify('Erro ao carregar chats', 'error');
        }
    }
}

// Torna loadChats global
window.loadChats = loadChats;

async function selectChat(chatId) {
    console.log('selectChat chamado com:', chatId);
    
    // Define chat atual
    if (typeof Chat !== 'undefined' && Chat.setCurrentChat) {
        Chat.setCurrentChat(chatId);
    }
    
    // Atualiza UI - marca o item clicado como ativo
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        // Verifica se este item corresponde ao chatId
        const itemChatId = item.getAttribute('data-chat-id') || 
                          (item.onclick && item.onclick.toString().match(/'([^']+)'/)?.[1]);
        if (itemChatId === chatId) {
            item.classList.add('active');
        }
    });
    
    // Tenta encontrar pelo onclick também
    document.querySelectorAll('.chat-item').forEach(item => {
        const onclickStr = item.getAttribute('onclick') || '';
        if (onclickStr.includes(chatId)) {
            item.classList.add('active');
        }
    });
    
    const noChatSelected = document.getElementById('no-chat-selected');
    const chatMessagesEl = document.getElementById('chat-messages');
    const messageInputContainer = document.getElementById('message-input-container');
    
    if (noChatSelected) noChatSelected.style.display = 'none';
    if (chatMessagesEl) chatMessagesEl.style.display = 'flex';
    if (messageInputContainer) messageInputContainer.style.display = 'flex';
    
    try {
        // Verifica se está em modo mockado
        const mockModule = (typeof Mock !== 'undefined' ? Mock : null) || (typeof window.Mock !== 'undefined' ? window.Mock : null);
        if (mockModule && mockModule.isMockMode && mockModule.isMockMode()) {
            console.log('Carregando mensagens do Mock...');
            const messages = await mockModule.getMessages(chatId);
            console.log('Mensagens recebidas:', messages);
            renderMessages(messages);
        } else if (typeof Chat !== 'undefined' && Chat.selectChat) {
            // Usa Chat.selectChat se disponível
            await Chat.selectChat(chatId, renderMessages);
        } else {
            // Fallback para API
            const apiModule = (typeof API !== 'undefined' ? API : null) || (typeof window.API !== 'undefined' ? window.API : null);
            if (apiModule && apiModule.getMessages) {
                const messages = await apiModule.getMessages(session, chatId);
                renderMessages(messages);
            } else {
                throw new Error('Nenhum método disponível para carregar mensagens');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        const uiModule = (typeof UI !== 'undefined' ? UI : null) || (typeof window.UI !== 'undefined' ? window.UI : null);
        if (uiModule && uiModule.notify) {
            uiModule.notify('Erro ao carregar mensagens', 'error');
        }
    }
}

// Torna selectChat global
window.selectChat = selectChat;

function renderMessages(messages) {
    console.log('renderMessages chamado com:', messages);
    const chatMessagesEl = document.getElementById('chat-messages');
    if (!chatMessagesEl) {
        console.error('chat-messages não encontrado!');
        return;
    }
    
    if (!messages || messages.length === 0) {
        chatMessagesEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Nenhuma mensagem ainda</div>';
        return;
    }
    
    // Tenta usar Chat.createMessageHtml, senão cria HTML simples
    const chatModule = (typeof Chat !== 'undefined' ? Chat : null) || (typeof window.Chat !== 'undefined' ? window.Chat : null);
    if (chatModule && chatModule.createMessageHtml) {
        chatMessagesEl.innerHTML = messages.map(msg => chatModule.createMessageHtml(msg)).join('');
    } else {
        // Fallback: cria HTML simples
        chatMessagesEl.innerHTML = messages.map(msg => {
            const messageText = msg.body || msg.text || '';
            const time = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
            return `
                <div class="message ${msg.fromMe ? 'sent' : 'received'}">
                    <div class="message-content">
                        ${messageText ? `<div class="message-text">${messageText}</div>` : ''}
                        <div class="message-time">${time}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Torna renderMessages global
window.renderMessages = renderMessages;

async function sendMessage() {
    if (!Chat.getCurrentChat() || !messageInput.value.trim()) return;
    
    const message = messageInput.value.trim();
    messageInput.value = '';
    
    try {
        const result = await Chat.sendMessage(message);
        
        // Se estiver em modo mockado, adiciona a mensagem enviada à tela
        if (Mock && Mock.isMockMode() && result && result.message) {
            const messageHtml = Chat.createMessageHtml(result.message);
            chatMessages.insertAdjacentHTML('beforeend', messageHtml);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
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
    if (typeof UI !== 'undefined' && UI.showChat) {
        UI.showChat();
    } else {
        // Fallback direto
        const loginScreen = document.getElementById('login-screen');
        const chatInterface = document.getElementById('chat-interface');
        if (loginScreen) loginScreen.style.display = 'none';
        if (chatInterface) chatInterface.style.display = 'flex';
    }
    // Só conecta WebSocket se não estiver em modo mockado
    if (typeof Mock !== 'undefined' && Mock.isMockMode()) {
        // Modo mockado, não conecta WebSocket
    } else if (typeof WebSocket !== 'undefined' && WebSocket.connectWebSocket) {
        WebSocket.connectWebSocket(phone, wsHandlers);
    }
    if (typeof loadChats === 'function') {
        loadChats();
    }
}

// Torna showChat global
window.showChat = showChat;

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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa estilos de notificação
    if (typeof UI !== 'undefined') {
        UI.initNotificationStyles();
    }
    
    // Inicializa elementos DOM
    loginScreen = document.getElementById('login-screen');
    chatInterface = document.getElementById('chat-interface');
    qrCode = document.getElementById('qr-code');
    phoneInput = document.getElementById('main-phone-input');
    chatList = document.getElementById('chat-list');
    chatMessages = document.getElementById('chat-messages');
    messageInput = document.getElementById('message-input');
    createSessionBtn = document.getElementById('create-session-btn');
    deleteSessionBtn = document.getElementById('delete-session-btn');
    refreshSessionBtn = document.getElementById('refresh-session-btn');
    
    // Inicializa phone input
    if (phoneInput) {
        phoneInput.value = phone;
        phoneInput.oninput = () => {
            phone = phoneInput.value.trim();
            localStorage.setItem('phone', phone);
        };
    }

// Event listeners
    const generateQRBtn = document.getElementById('generate-qr-btn');
    const startSessionBtn = document.getElementById('start-session-btn');
    const stopSessionBtn = document.getElementById('stop-session-btn');
    const showChatBtn = document.getElementById('show-chat-btn');
    const sessionSettingsBtn = document.getElementById('session-settings-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const sendBtn = document.getElementById('send-btn');
    const startMockBtn = document.getElementById('start-mock-btn');
    
    console.log('Inicializando event listeners...');
    console.log('Botão mockado encontrado?', !!startMockBtn);
    
    if (generateQRBtn) generateQRBtn.onclick = generateQR;
    if (startSessionBtn) startSessionBtn.onclick = startSession;
    if (stopSessionBtn) stopSessionBtn.onclick = stopSession;
    if (showChatBtn) showChatBtn.onclick = showChat;
    if (sessionSettingsBtn) sessionSettingsBtn.onclick = showSessionSettings;
    if (logoutBtn) logoutBtn.onclick = logout;
    if (sendBtn) sendBtn.onclick = sendMessage;
    if (startMockBtn) {
        console.log('✅ Botão mockado encontrado:', startMockBtn);
        console.log('Configurando event listener...');
        
        // Tenta múltiplas formas de adicionar o listener
        startMockBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Botão mockado clicado (onclick)!');
            console.log('startMockMode disponível?', typeof startMockMode !== 'undefined');
            console.log('window.startMockMode disponível?', typeof window.startMockMode !== 'undefined');
            if (typeof startMockMode === 'function') {
                try {
                    startMockMode();
                } catch (err) {
                    console.error('Erro ao executar startMockMode:', err);
                    alert('Erro: ' + err.message);
                }
            } else if (typeof window.startMockMode === 'function') {
                try {
                    window.startMockMode();
                } catch (err) {
                    console.error('Erro ao executar window.startMockMode:', err);
                    alert('Erro: ' + err.message);
                }
            } else {
                console.error('❌ startMockMode não está definida!');
                alert('Erro: função startMockMode não encontrada. Verifique o console.');
            }
        };
        
        startMockBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Botão mockado clicado (addEventListener)!');
            if (typeof startMockMode === 'function') {
                startMockMode();
            } else if (typeof window.startMockMode === 'function') {
                window.startMockMode();
            }
        });
        
        console.log('✅ Event listeners configurados no botão mockado');
        
        // Teste: tenta clicar programaticamente após 1 segundo
        setTimeout(() => {
            console.log('Teste: verificando se o botão está funcionando...');
            console.log('Botão ainda existe?', !!document.getElementById('start-mock-btn'));
        }, 1000);
    } else {
        console.error('❌ Botão start-mock-btn não encontrado!');
        console.log('Tentando encontrar novamente...');
        const btn = document.getElementById('start-mock-btn');
        console.log('Botão encontrado na segunda tentativa?', !!btn);
    }
    
    if (createSessionBtn) createSessionBtn.onclick = createSession;
    if (deleteSessionBtn) deleteSessionBtn.onclick = deleteSession;
    if (refreshSessionBtn) refreshSessionBtn.onclick = checkSessionStatus;
    
    if (messageInput) {
messageInput.onkeypress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};
    }
    
    // Verifica se já está em modo mockado
    if (Mock && Mock.isMockMode()) {
        showChat();
        loadChats();
    } else {
        UI.showLogin();
        
    const sessionControls = document.getElementById('session-controls');
    if (sessionControls) {
        sessionControls.style.display = 'block';
    }
    
    checkSessionStatus();
    
    if (phone) {
        checkStatus();
        }
    }
});
