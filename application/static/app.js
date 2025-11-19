/**
 * Aplicação principal WhatsApp Web.
 * Integra todos os módulos e gerencia o fluxo da aplicação.
 * Versão: 3.0 - Todas as referências diretas a Chat removidas
 */

console.log('📱 app.js carregado (versão 3.0)');

// Configuração
let phone = localStorage.getItem('phone') || '';
let session = 'default';

// Funções auxiliares para acessar módulos de forma segura
// Versão: 2.0 - Todas as referências diretas removidas
function getUIModule() {
    try {
        return (typeof window.UI !== 'undefined') ? window.UI : null;
    } catch (e) {
        return null;
    }
}

function getMockModule() {
    try {
        return (typeof window.Mock !== 'undefined') ? window.Mock : null;
    } catch (e) {
        return null;
    }
}

function getChatModule() {
    try {
        return (typeof window.Chat !== 'undefined') ? window.Chat : null;
    } catch (e) {
        return null;
    }
}

// Torna as funções auxiliares globais para uso em onclick handlers
window.getUIModule = getUIModule;
window.getMockModule = getMockModule;
window.getChatModule = getChatModule;

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
        const ui = getUIModule();
        if (ui) {
            ui.showLogin();
            ui.notify('Falha na autenticação', 'error');
        }
    },
    onQR: (qr) => {
        const ui = getUIModule();
        if (ui) {
            ui.showQR(qr);
            ui.notify('QR Code atualizado', 'info');
        }
    },
    onReady: () => {
        const ui = getUIModule();
        if (ui) {
            ui.showChat();
            ui.notify('WhatsApp conectado!', 'success');
        }
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
    const ui = getUIModule();
    try {
        if (ui) ui.updateStatus('Criando sessão...');
        await Session.createSession(phone);
        if (ui) ui.notify('✅ Sessão criada!', 'success');
        await checkSessionStatus();
    } catch (error) {
        console.error('❌ Erro ao criar sessão:', error);
        if (ui) ui.notify(`❌ Erro ao criar sessão: ${error.message}`, 'error');
    }
}

async function deleteSession() {
    const ui = getUIModule();
    try {
        if (ui) ui.updateStatus('Deletando sessão...');
        await Session.deleteSession(session);
        if (ui) ui.notify('✅ Sessão deletada!', 'success');
        await checkSessionStatus();
    } catch (error) {
        console.error('❌ Erro ao deletar sessão:', error);
        if (ui) ui.notify(`❌ Erro ao deletar sessão: ${error.message}`, 'error');
    }
}

async function checkSessionStatus() {
    const ui = getUIModule();
    try {
        const sessionData = await Session.checkSessionStatus();
        if (ui) ui.updateSessionStatus(sessionData);
    } catch (error) {
        console.error('❌ Erro ao verificar status da sessão:', error);
        if (ui) ui.updateSessionStatus({ status: 'ERROR', name: null });
    }
}

// Autenticação
async function generateQR() {
    const ui = getUIModule();
    if (!phone) {
        if (ui) ui.notify('Digite seu telefone', 'warning');
            return;
        }
        
    try {
        if (ui) ui.updateStatus('Gerando QR Code...');
        const qrUrl = await Session.generateQRCode(session, phone);
        if (qrUrl) {
            if (ui) {
                ui.showQR(qrUrl);
                ui.updateStatus('QR Code pronto! Escaneie com seu WhatsApp');
                ui.notify('QR Code gerado!', 'success');
            }
        } else {
            // Já está conectado
            const status = await API.getSessionStatus(session);
            if (ui) ui.updateSessionInfo(status);
        }
    } catch (error) {
        if (ui) {
            ui.updateStatus('Erro: ' + error.message);
            ui.notify('Erro ao gerar QR', 'error');
        }
    }
}

async function startSession() {
    const ui = getUIModule();
    try {
        if (ui) ui.updateStatus('Iniciando sessão...');
        await Session.startSession(session);
        if (ui) ui.notify('Sessão iniciada', 'success');
        await checkStatus();
    } catch (error) {
        if (ui) ui.notify('Erro ao iniciar sessão: ' + error.message, 'error');
    }
}

async function stopSession() {
    const ui = getUIModule();
    try {
        if (ui) ui.updateStatus('Parando sessão...');
        await Session.stopSession(session);
        if (ui) ui.notify('Sessão parada', 'success');
        await checkStatus();
    } catch (error) {
        if (ui) ui.notify('Erro ao parar sessão: ' + error.message, 'error');
    }
}

async function logout() {
    const ui = getUIModule();
    const mock = getMockModule();
    try {
        // Se estiver em modo mockado, apenas desativa o modo
        if (mock && mock.isMockMode && mock.isMockMode()) {
            mock.disableMockMode();
            if (ui) {
                ui.showLogin();
                ui.notify('Modo mockado desativado', 'success');
            }
        } else {
            await Session.logout(session);
            if (ui) {
                ui.showLogin();
                ui.notify('Logout completo realizado', 'success');
            }
        }
    } catch (error) {
        if (ui) ui.notify('Erro no logout: ' + error.message, 'error');
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
        
        const ui = getUIModule();
        if (ui) {
            ui.updateStatus(data.status);
            ui.updateSessionInfo(data);
        }
        
        if (data.status === 'WORKING' || data.status === 'AUTHENTICATED') {
            console.log('✅ Status conectado');
        } else if (data.status === 'SCAN_QR_CODE') {
            console.log('📱 Status aguardando QR code...');
            try {
                const qrData = await API.getQRCode(session);
                const qrUrl = URL.createObjectURL(qrData);
                if (ui) ui.showQR(qrUrl);
            } catch (e) {
                console.error('Erro ao obter QR code:', e);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        const ui = getUIModule();
        if (ui) ui.updateStatus('Erro ao verificar status');
    }
}

// Modo mockado - função global (substitui a versão inline do HTML)
window._startMockModeReady = function() {
    console.log('=== startMockMode chamado (app.js) ===');
    const mock = getMockModule();
    const ui = getUIModule();
    const chat = getChatModule();
    
    if (!mock) {
        console.error('❌ Módulo Mock não disponível - não é possível iniciar modo mockado');
        alert('Erro: módulo Mock não carregado. Recarregue a página.');
        return;
    }
    
    if (!ui) {
        console.warn('⚠️ UI ainda não carregada. Usando fallback simples.');
    }
    
    try {
        console.log('Ativando modo mockado...');
        if (mock.enableMockMode) {
            mock.enableMockMode();
        }
        console.log('Modo mockado ativado no localStorage');
        
        console.log('Mostrando notificação...');
        if (ui && ui.notify) {
            ui.notify('Modo mockado ativado!', 'success');
        }
        
        console.log('Mostrando chat...');
        if (ui && ui.showChat) {
            ui.showChat();
        } else {
            const loginScreenEl = document.getElementById('login-screen');
            const chatInterfaceEl = document.getElementById('chat-interface');
            if (loginScreenEl) loginScreenEl.style.display = 'none';
            if (chatInterfaceEl) chatInterfaceEl.style.display = 'flex';
        }
        
        // Aguarda um pouco para garantir que as funções estejam disponíveis
        setTimeout(() => {
            if (typeof loadChats === 'function' || typeof window.loadChats === 'function') {
                (loadChats || window.loadChats)();
            } else if (mock.getChats) {
                console.log('Carregando chats diretamente do Mock (fallback)...');
                mock.getChats().then(chats => {
                    const chatListEl = document.getElementById('chat-list');
                    if (chatListEl) {
                        const html = chats.map(chat => {
                            const chatId = chat.id._serialized || chat.id;
                            const name = chat.name || chatId?.split?.('@')[0] || 'Desconhecido';
                            return `
                                <div class="chat-item" data-chat-id="${chatId}" onclick="window.selectChat && window.selectChat('${chatId}')">
                                    <div class="chat-avatar"><div class="avatar-placeholder">👤</div></div>
                                    <div class="chat-info">
                                        <div class="chat-name">${name}</div>
                                        <div class="chat-preview">${chat.lastMessage?.body || ''}</div>
                                    </div>
                                </div>
                            `;
                        }).join('');
                        chatListEl.innerHTML = html;
                    }
                });
            }
        }, 200);
    } catch (error) {
        console.error('❌ Erro ao iniciar modo mockado:', error);
        console.error('Stack trace:', error.stack);
        if (ui && ui.notify) {
            ui.notify('Erro ao iniciar modo mockado: ' + error.message, 'error');
        }
    }
};

// Substitui a função inline do HTML pela versão completa
window.startMockMode = window._startMockModeReady;

// Garante que está disponível globalmente
if (typeof window.startMockMode !== 'function') {
    console.error('❌ Falha ao definir window.startMockMode!');
} else {
    console.log('✅ window.startMockMode definida e disponível globalmente');
}

// Se alguém clicou antes, executa assim que os módulos carregarem
if (window._pendingMockModeStart) {
    console.log('🔁 Processando chamada pendente do modo mockado...');
    window._pendingMockModeStart = false;
    setTimeout(() => window.startMockMode(), 50);
}

// Configura handler para novas mensagens mockadas
window.mockMessageHandler = (message, chatId) => {
    const chatModule = getChatModule();
    if (chatModule) {
        const currentChatId = chatModule.getCurrentChat ? chatModule.getCurrentChat() : null;
        if (currentChatId && chatId === currentChatId) {
            const messageHtml = (chatModule.createMessageHtml) 
                ? chatModule.createMessageHtml(message)
                : createSimpleMessageHtml(message);
            const chatMessagesEl = document.getElementById('chat-messages');
            if (chatMessagesEl) {
                chatMessagesEl.insertAdjacentHTML('beforeend', messageHtml);
                chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            }
        }
        if (typeof loadChats === 'function' || typeof window.loadChats === 'function') {
            (loadChats || window.loadChats)();
        }
    }
};

console.log('✅ window.startMockMode definida em app.js:', typeof window.startMockMode);

// Chats e mensagens
async function loadChats() {
    console.log('🔄 loadChats chamado...');
    try {
        const chatListEl = document.getElementById('chat-list');
        if (!chatListEl) {
            console.log('⚠️ chat-list não encontrado, aguardando...');
            setTimeout(loadChats, 100);
            return;
        }
        
        // Verifica se está em modo mockado
        const mock = getMockModule();
        console.log('🔍 Verificando modo mockado...');
        console.log('  mock disponível?', !!mock);
        console.log('  mock.isMockMode?', mock && typeof mock.isMockMode);
        
        let isMock = false;
        try {
            if (mock && mock.isMockMode) {
                isMock = mock.isMockMode();
                console.log('  isMockMode() retornou:', isMock);
            } else {
                // Fallback: verifica localStorage diretamente
                isMock = localStorage.getItem('mockMode') === 'true';
                console.log('  Verificando localStorage diretamente:', isMock);
            }
        } catch (err) {
            console.error('  Erro ao verificar modo mockado:', err);
            // Fallback: verifica localStorage diretamente
            isMock = localStorage.getItem('mockMode') === 'true';
            console.log('  Usando fallback localStorage:', isMock);
        }
        
        if (isMock) {
            console.log('✅ Modo mockado detectado, carregando chats do Mock...');
            try {
                if (!mock || !mock.getChats) {
                    throw new Error('Mock.getChats não disponível');
                }
                console.log('  Chamando mock.getChats()...');
                const chats = await mock.getChats();
                console.log('✅ Chats recebidos do Mock:', chats ? chats.length : 0);
                console.log('  Chats:', chats);
                
                // Tenta usar Chat.renderChats se disponível
                const chatModule = getChatModule();
                if (chatModule && chatModule.renderChats) {
                    console.log('✅ Usando Chat.renderChats...');
                    try {
                        chatListEl.innerHTML = chatModule.renderChats(chats, 'selectChat');
                        console.log('✅ Chats renderizados com Chat.renderChats');
                    } catch (renderErr) {
                        console.error('❌ Erro ao renderizar com Chat.renderChats:', renderErr);
                        throw renderErr;
                    }
                } else {
                    console.log('⚠️ Chat.renderChats não disponível, usando fallback...');
                    // Fallback: renderiza chats simples
                    try {
                        const html = chats.map((chat, index) => {
                            try {
                                const chatId = chat.id && chat.id._serialized ? chat.id._serialized : (chat.id || `unknown-${index}`);
                                const name = chat.name || (typeof chatId === 'string' ? chatId.split('@')[0] : 'Desconhecido');
                                const lastMsg = chat.lastMessage || {};
                                const lastMsgText = (lastMsg.body || '').substring(0, 50); // Limita tamanho
                                const lastMsgTime = lastMsg.timestamp
            ? new Date(lastMsg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : '';
        const unread = chat.unreadCount > 0
            ? `<span class="unread-badge">${chat.unreadCount}</span>`
            : '';

        return `
                                    <div class="chat-item" data-chat-id="${chatId}" onclick="if (typeof window.selectChat === 'function') { window.selectChat('${chatId}'); } else { alert('Função selectChat não disponível'); }">
                <div class="chat-avatar">
                    <div class="avatar-placeholder">👤</div>
                </div>
                <div class="chat-info">
                    <div class="chat-header">
                        <div class="chat-name">${name}</div>
                        <div class="chat-time">${lastMsgTime}</div>
                    </div>
                    <div class="chat-preview">
                                                <div class="chat-message">${lastMsgText}</div>
                        ${unread}
                    </div>
                </div>
            </div>
        `;
                            } catch (chatErr) {
                                console.error(`❌ Erro ao renderizar chat ${index}:`, chatErr);
                                return '';
                            }
                        }).filter(html => html).join('');
                        
                        chatListEl.innerHTML = html;
                        console.log('✅ Chats renderizados com fallback');
                    } catch (renderErr) {
                        console.error('❌ Erro ao renderizar chats com fallback:', renderErr);
                        throw renderErr;
                    }
                }
                console.log('✅ Lista de chats renderizada com sucesso!');
                return;
            } catch (err) {
                console.error('❌ Erro ao carregar chats do Mock:', err);
                console.error('  Tipo do erro:', typeof err);
                console.error('  Mensagem:', err.message);
                console.error('  Stack:', err.stack);
                throw err;
            }
        }
        
        // Modo normal: usa Chat module
        const chatModule = getChatModule();
        if (!chatModule || !chatModule.loadChats) {
            console.log('⚠️ Chat.loadChats não disponível, aguardando...');
            setTimeout(loadChats, 100);
            return;
        }
        
        console.log('✅ Carregando chats via Chat.loadChats...');
        const chats = await chatModule.loadChats();
        console.log('✅ Chats recebidos:', chats ? chats.length : 0);
        
        if (chatModule.renderChats) {
            chatListEl.innerHTML = chatModule.renderChats(chats, 'selectChat');
            console.log('✅ Chats renderizados com sucesso!');
    } else {
            console.warn('⚠️ Chat.renderChats não disponível');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar chats:', error);
        console.error('Stack:', error.stack);
        const uiModule = getUIModule();
        if (uiModule && uiModule.notify) {
            uiModule.notify('Erro ao carregar chats', 'error');
        }
    }
}

// Torna loadChats global - usa a função diretamente, não um wrapper
window.loadChats = loadChats;

// Log para confirmar que a função foi definida
console.log('✅ window.loadChats definida:', typeof window.loadChats);

async function selectChat(chatId) {
    console.log('selectChat chamado com:', chatId);
    console.log('Versão selectChat: 3.0');
    
    // Define chatModule no escopo da função - NUNCA use Chat diretamente!
    let chatModule = null;
    try {
        chatModule = getChatModule();
    } catch (err) {
        console.error('Erro ao obter chatModule:', err);
    }
    
    try {
        // Define chat atual - verifica de forma segura
        if (chatModule && chatModule.setCurrentChat) {
            chatModule.setCurrentChat(chatId);
        }
    } catch (err) {
        console.warn('⚠️ Erro ao definir chat atual:', err);
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
        const mockModule = getMockModule();
        if (mockModule && mockModule.isMockMode && mockModule.isMockMode()) {
            console.log('✅ Carregando mensagens do Mock...');
            const messages = await mockModule.getMessages(chatId);
            console.log('✅ Mensagens recebidas:', messages);
            renderMessages(messages);
        } else if (chatModule && chatModule.selectChat) {
            // Usa Chat.selectChat se disponível
            console.log('✅ Usando Chat.selectChat...');
            await chatModule.selectChat(chatId, renderMessages);
        } else {
            // Fallback para API
            console.log('⚠️ Usando fallback API...');
            const apiModule = (typeof API !== 'undefined' ? API : null) || (typeof window.API !== 'undefined' ? window.API : null);
            if (apiModule && apiModule.getMessages) {
                const messages = await apiModule.getMessages(session, chatId);
                renderMessages(messages);
            } else {
                throw new Error('Nenhum método disponível para carregar mensagens');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar mensagens:', error);
        console.error('Stack:', error.stack);
        const uiModule = getUIModule();
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
    
    try {
        // Tenta usar Chat.createMessageHtml, senão cria HTML simples
        const chatModule = getChatModule();
        if (chatModule && chatModule.createMessageHtml) {
            try {
                chatMessagesEl.innerHTML = messages.map(msg => chatModule.createMessageHtml(msg)).join('');
                console.log('✅ Mensagens renderizadas com Chat.createMessageHtml');
            } catch (renderErr) {
                console.error('❌ Erro ao renderizar com Chat.createMessageHtml:', renderErr);
                // Fallback para renderização simples
                throw renderErr;
            }
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
            console.log('✅ Mensagens renderizadas com fallback simples');
        }
        
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    } catch (error) {
        console.error('❌ Erro ao renderizar mensagens:', error);
        console.error('Stack:', error.stack);
        chatMessagesEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #e74c3c;">Erro ao carregar mensagens</div>';
    }
}

// Torna renderMessages global
window.renderMessages = renderMessages;

async function sendMessage() {
    const chatModule = getChatModule();
    const currentChatId = chatModule && chatModule.getCurrentChat ? chatModule.getCurrentChat() : null;
    const messageInputEl = document.getElementById('message-input');
    
    if (!currentChatId || !messageInputEl || !messageInputEl.value.trim()) return;
    
    const message = messageInputEl.value.trim();
    messageInputEl.value = '';
    
    try {
        const mockModule = getMockModule();
        const uiModule = getUIModule();
        
        let result;
        if (mockModule && mockModule.isMockMode && mockModule.isMockMode()) {
            // Modo mockado
            result = await mockModule.sendMessage(currentChatId, message);
            
            // Adiciona a mensagem enviada à tela
            if (result && result.message) {
                const chatMessagesEl = document.getElementById('chat-messages');
                if (chatMessagesEl) {
                    const messageHtml = (chatModule && chatModule.createMessageHtml) 
                        ? chatModule.createMessageHtml(result.message)
                        : createSimpleMessageHtml(result.message);
                    chatMessagesEl.insertAdjacentHTML('beforeend', messageHtml);
                    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
                }
            }
        } else if (chatModule && chatModule.sendMessage) {
            // Usa Chat.sendMessage
            result = await chatModule.sendMessage(message);
    } else {
            throw new Error('Nenhum método disponível para enviar mensagem');
        }
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        const uiModule = getUIModule();
        if (uiModule && uiModule.notify) {
            uiModule.notify('Erro ao enviar mensagem', 'error');
        }
    }
}

// Função auxiliar para criar HTML de mensagem simples
function createSimpleMessageHtml(message) {
    const messageText = message.body || message.text || '';
    const time = message.timestamp ? new Date(message.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
        <div class="message ${message.fromMe ? 'sent' : 'received'}">
            <div class="message-content">
                ${messageText ? `<div class="message-text">${messageText}</div>` : ''}
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
}

// Torna createSimpleMessageHtml global
window.createSimpleMessageHtml = createSimpleMessageHtml;

function handleNewMessage(messageData) {
    const chatId = messageData.from;
    const chatModule = getChatModule();
    const currentChatId = chatModule && chatModule.getCurrentChat ? chatModule.getCurrentChat() : null;
    
    if (currentChatId && chatId === currentChatId) {
        const messageObj = {
            body: messageData.body,
            fromMe: messageData.fromMe,
            timestamp: messageData.timestamp,
            hasMedia: messageData.hasMedia,
            media: messageData.media
        };
        
        const chatMessagesEl = document.getElementById('chat-messages');
        if (chatMessagesEl) {
            const messageHtml = (chatModule && chatModule.createMessageHtml) 
                ? chatModule.createMessageHtml(messageObj)
                : createSimpleMessageHtml(messageObj);
            chatMessagesEl.insertAdjacentHTML('beforeend', messageHtml);
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }
    }
    
    if (typeof loadChats === 'function' || typeof window.loadChats === 'function') {
        (loadChats || window.loadChats)();
    }
}

// UI
function showChat() {
    const ui = getUIModule();
    if (ui && ui.showChat) {
        ui.showChat();
    } else {
        // Fallback direto
        const loginScreen = document.getElementById('login-screen');
        const chatInterface = document.getElementById('chat-interface');
        if (loginScreen) loginScreen.style.display = 'none';
        if (chatInterface) chatInterface.style.display = 'flex';
    }
    // Só conecta WebSocket se não estiver em modo mockado
    const mock = getMockModule();
    if (mock && mock.isMockMode && mock.isMockMode()) {
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
    const ui = getUIModule();
    if (ui) ui.showLogin();
    WebSocket.disconnectWebSocket();
}

function showSessionSettings() {
    const ui = getUIModule();
    if (ui) {
        ui.showLogin();
        ui.notify('Tela de configurações da sessão', 'info');
    }
    checkStatus();
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
        const ui = getUIModule();
        if (ui && ui.initNotificationStyles) ui.initNotificationStyles();
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
    const mock = getMockModule();
    if (mock && mock.isMockMode && mock.isMockMode()) {
        showChat();
        loadChats();
    } else {
        const ui = getUIModule();
    if (ui) ui.showLogin();
        
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
