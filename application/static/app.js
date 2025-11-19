/**
 * Aplicação principal WhatsApp Web.
 * Integra todos os módulos e gerencia o fluxo da aplicação.
 */

// Configuração de debug - pode ser ativada via localStorage ou URL param
const DEBUG = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlDebug = urlParams.get('debug') === 'true';
    const storageDebug = localStorage.getItem('debug') === 'true';
    return urlDebug || storageDebug;
})();

// Função de log condicional
function debugLog(...args) {
    if (DEBUG) {
        console.log('[APP]', ...args);
    }
}

function debugError(...args) {
    // Erros sempre são logados
    console.error('[APP]', ...args);
}

if (DEBUG) {
    debugLog('📱 app.js carregado (modo debug ativado)');
}

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

function getChatModule() {
    try {
        return (typeof window.Chat !== 'undefined') ? window.Chat : null;
    } catch (e) {
        return null;
    }
}

// Torna as funções auxiliares globais para uso em onclick handlers
window.getUIModule = getUIModule;
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
        debugLog('✅ WebSocket conectado!');
    },
    onClose: () => {
        debugLog('🔌 WebSocket desconectado');
    },
    onError: (error) => {
        debugError('❌ WebSocket error:', error);
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
        debugLog('Confirmação de mensagem:', ackData);
    },
    onChatUpdate: (chatData) => {
        debugLog('Chat atualizado:', chatData);
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
        debugError('❌ Erro ao criar sessão:', error);
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
        debugError('❌ Erro ao deletar sessão:', error);
        if (ui) ui.notify(`❌ Erro ao deletar sessão: ${error.message}`, 'error');
    }
}

async function checkSessionStatus() {
    const ui = getUIModule();
    try {
        const sessionData = await Session.checkSessionStatus();
        if (ui) ui.updateSessionStatus(sessionData);
    } catch (error) {
        debugError('❌ Erro ao verificar status da sessão:', error);
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
    try {
        await Session.logout(session);
        if (ui) {
            ui.showLogin();
            ui.notify('Logout completo realizado', 'success');
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
            debugLog('✅ Status conectado');
        } else if (data.status === 'SCAN_QR_CODE') {
            debugLog('📱 Status aguardando QR code...');
            try {
                const qrData = await API.getQRCode(session);
                const qrUrl = URL.createObjectURL(qrData);
                if (ui) ui.showQR(qrUrl);
            } catch (e) {
                debugError('Erro ao obter QR code:', e);
            }
        }
    } catch (error) {
        debugError('❌ Erro ao verificar status:', error);
        const ui = getUIModule();
        if (ui) ui.updateStatus('Erro ao verificar status');
    }
}


// Chats e mensagens
async function loadChats() {
    debugLog('🔄 loadChats chamado...');
    try {
        const chatListEl = document.getElementById('chat-list');
        if (!chatListEl) {
            debugLog('⚠️ chat-list não encontrado, aguardando...');
            setTimeout(loadChats, 100);
            return;
        }
        
        // Carrega chats via Chat module
        const chatModule = getChatModule();
        if (!chatModule || !chatModule.loadChats) {
            debugLog('⚠️ Chat.loadChats não disponível, aguardando...');
            setTimeout(loadChats, 100);
            return;
        }
        
        debugLog('✅ Carregando chats via Chat.loadChats...');
        const chats = await chatModule.loadChats();
        debugLog('✅ Chats recebidos:', chats ? chats.length : 0);
        
        if (chatModule.renderChats) {
            chatListEl.innerHTML = chatModule.renderChats(chats, 'selectChat');
            debugLog('✅ Chats renderizados com sucesso!');
    } else {
            if (DEBUG) console.warn('[APP] ⚠️ Chat.renderChats não disponível');
        }
    } catch (error) {
        debugError('❌ Erro ao carregar chats:', error);
        if (DEBUG) console.error('[APP] Stack:', error.stack);
        const uiModule = getUIModule();
        if (uiModule && uiModule.notify) {
            uiModule.notify('Erro ao carregar chats', 'error');
        }
    }
}

// Torna loadChats global - usa a função diretamente, não um wrapper
window.loadChats = loadChats;

// Log para confirmar que a função foi definida
debugLog('✅ window.loadChats definida:', typeof window.loadChats);

async function selectChat(chatId) {
    debugLog('selectChat chamado com:', chatId);
    
    // Define chatModule no escopo da função - NUNCA use Chat diretamente!
    let chatModule = null;
    try {
        chatModule = getChatModule();
    } catch (err) {
        debugError('Erro ao obter chatModule:', err);
    }
    
    try {
        // Define chat atual - verifica de forma segura
        if (chatModule && chatModule.setCurrentChat) {
            chatModule.setCurrentChat(chatId);
        }
        
        // Busca informações do chat para saber se é grupo
        const apiModule = (typeof API !== 'undefined' ? API : null) || (typeof window.API !== 'undefined' ? window.API : null);
        if (apiModule && apiModule.getChats && chatModule && chatModule.setCurrentChatInfo) {
            try {
                const chats = await apiModule.getChats(session);
                if (!chats || !Array.isArray(chats)) {
                    debugError('❌ ERRO: getChats não retornou um array válido:', chats);
                } else {
                    const chatInfo = chats.find(chat => {
                        const id = chat.id?._serialized || chat.id;
                        return id === chatId;
                    });
                    if (chatInfo) {
                        chatModule.setCurrentChatInfo(chatInfo);
                        // Verifica isGroup em _chat.isGroup ou isGroup direto
                        const isGroup = chatInfo._chat?.isGroup ?? chatInfo.isGroup;
                        debugLog('Chat info carregado:', { isGroup, name: chatInfo.name, has_chat: !!chatInfo._chat });
                        
                        // Log de erro se isGroup não estiver definido
                        if (typeof isGroup === 'undefined') {
                            debugError('❌ ERRO: Não foi possível determinar se a conversa é um grupo. Campo isGroup não encontrado em chat.isGroup nem em chat._chat.isGroup. Estrutura do chat:', {
                                hasIsGroup: typeof chatInfo.isGroup !== 'undefined',
                                has_chat: !!chatInfo._chat,
                                has_chat_isGroup: typeof chatInfo._chat?.isGroup !== 'undefined',
                                chatKeys: Object.keys(chatInfo),
                                chat_chatKeys: chatInfo._chat ? Object.keys(chatInfo._chat) : null
                            });
                        }
                    } else {
                        debugError('❌ ERRO: Chat não encontrado na lista. chatId:', chatId, 'Chats disponíveis:', chats.map(c => c.id?._serialized || c.id));
                    }
                }
            } catch (e) {
                debugError('❌ ERRO ao buscar info do chat:', e);
            }
        } else {
            debugError('❌ ERRO: API module, getChats ou setCurrentChatInfo não disponível');
        }
    } catch (err) {
        if (DEBUG) console.warn('[APP] ⚠️ Erro ao definir chat atual:', err);
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
        // Garante que as informações do chat foram carregadas antes de renderizar
        // Se ainda não foram carregadas, aguarda um pouco
        if (chatModule && chatModule.getCurrentChatInfo) {
            let chatInfo = chatModule.getCurrentChatInfo();
            if (!chatInfo) {
                // Aguarda um pouco para as informações serem carregadas
                await new Promise(resolve => setTimeout(resolve, 100));
                chatInfo = chatModule.getCurrentChatInfo();
            }
            debugLog('Chat info antes de renderizar:', chatInfo ? { isGroup: chatInfo.isGroup, name: chatInfo.name } : 'não encontrado');
        }
        
        if (chatModule && chatModule.selectChat) {
            // Usa Chat.selectChat se disponível
            debugLog('✅ Usando Chat.selectChat...');
            await chatModule.selectChat(chatId, renderMessages);
        } else {
            // Fallback para API
            debugLog('⚠️ Usando fallback API...');
            const apiModule = (typeof API !== 'undefined' ? API : null) || (typeof window.API !== 'undefined' ? window.API : null);
            if (apiModule && apiModule.getMessages) {
                const messages = await apiModule.getMessages(session, chatId);
                renderMessages(messages);
            } else {
                throw new Error('Nenhum método disponível para carregar mensagens');
            }
        }
    } catch (error) {
        debugError('❌ Erro ao carregar mensagens:', error);
        if (DEBUG) console.error('[APP] Stack:', error.stack);
        const uiModule = getUIModule();
        if (uiModule && uiModule.notify) {
            uiModule.notify('Erro ao carregar mensagens', 'error');
        }
    }
}

// Torna selectChat global
window.selectChat = selectChat;

function renderMessages(messages) {
    debugLog('renderMessages chamado com:', messages);
    const chatMessagesEl = document.getElementById('chat-messages');
    if (!chatMessagesEl) {
        debugError('chat-messages não encontrado!');
        return;
    }
    
    if (!messages || messages.length === 0) {
        chatMessagesEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">Nenhuma mensagem ainda</div>';
        return;
    }
    
    try {
        // Ordena mensagens por timestamp (crescente: mais antigas primeiro, mais recentes por último)
        const sortedMessages = [...messages].sort((a, b) => {
            const timestampA = a.timestamp || 0;
            const timestampB = b.timestamp || 0;
            return timestampA - timestampB;
        });
        
        debugLog(`Mensagens ordenadas: ${messages.length} -> ${sortedMessages.length}`);
        
        // Tenta usar Chat.createMessageHtml, senão cria HTML simples
        const chatModule = getChatModule();
        
        // Verifica informações do chat antes de renderizar
        const chatInfo = chatModule && chatModule.getCurrentChatInfo ? chatModule.getCurrentChatInfo() : null;
        // Verifica isGroup em _chat.isGroup ou isGroup direto
        const isGroupFromInfo = chatInfo ? (chatInfo._chat?.isGroup ?? chatInfo.isGroup) : undefined;
        debugLog('Renderizando mensagens. Chat info:', chatInfo ? { isGroup: isGroupFromInfo, name: chatInfo.name, has_chat: !!chatInfo._chat } : 'não encontrado');
        
        if (chatModule && chatModule.createMessageHtml) {
            try {
                chatMessagesEl.innerHTML = sortedMessages.map(msg => chatModule.createMessageHtml(msg)).join('');
                debugLog('✅ Mensagens renderizadas com Chat.createMessageHtml');
            } catch (renderErr) {
                debugError('❌ Erro ao renderizar com Chat.createMessageHtml:', renderErr);
                // Fallback para renderização simples
                throw renderErr;
            }
        } else {
            // Fallback: cria HTML simples
            // chatInfo já foi obtido acima, não precisa buscar novamente
            const isGroup = chatInfo && chatInfo.isGroup;
            
            // Log de erro se não conseguir determinar se é grupo
            if (chatInfo === null) {
                debugError('❌ ERRO: Não foi possível determinar se a conversa é um grupo. chatInfo é null.');
            } else if (typeof chatInfo.isGroup === 'undefined') {
                debugError('❌ ERRO: Campo isGroup não encontrado no chatInfo:', chatInfo);
            }
            
            chatMessagesEl.innerHTML = sortedMessages.map(msg => {
                const messageText = msg.body || msg.text || '';
                const time = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                const showSenderName = isGroup && !msg.fromMe;
                
                // Tenta obter o nome do remetente de várias fontes
                let senderName = '';
                if (showSenderName) {
                    senderName = msg.contact?.pushName || 
                                msg.contact?.name || 
                                msg.author?.pushName || 
                                msg.author?.name || 
                                msg.notifyName ||
                                msg.fromName ||
                                (msg.from ? msg.from.split('@')[0] : '') || 
                                null;
                    
                    // Log de erro se não conseguir encontrar o nome
                    if (!senderName) {
                        debugError('❌ ERRO: Não foi possível encontrar o nome ou número do contato. Estrutura da mensagem:', {
                            hasContact: !!msg.contact,
                            contact: msg.contact,
                            hasAuthor: !!msg.author,
                            author: msg.author,
                            notifyName: msg.notifyName,
                            fromName: msg.fromName,
                            from: msg.from,
                            messageKeys: Object.keys(msg)
                        });
                        senderName = msg.from ? msg.from.split('@')[0] : 'Desconhecido';
                    } else {
                        debugLog('Nome do remetente encontrado (fallback):', { 
                            senderName, 
                            source: msg.contact?.pushName ? 'contact.pushName' :
                                    msg.contact?.name ? 'contact.name' :
                                    msg.author?.pushName ? 'author.pushName' :
                                    msg.author?.name ? 'author.name' :
                                    msg.notifyName ? 'notifyName' :
                                    msg.fromName ? 'fromName' :
                                    'from (número)',
                            from: msg.from 
                        });
                    }
                }

                return `
                    <div class="message ${msg.fromMe ? 'sent' : 'received'}">
                        <div class="message-content">
                            ${showSenderName ? `<div class="message-sender">${senderName}</div>` : ''}
                            ${messageText ? `<div class="message-text">${messageText}</div>` : ''}
                            <div class="message-time">${time}</div>
                        </div>
                    </div>
                `;
            }).join('');
            debugLog('✅ Mensagens renderizadas com fallback simples');
        }
        
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    } catch (error) {
        debugError('❌ Erro ao renderizar mensagens:', error);
        if (DEBUG) console.error('[APP] Stack:', error.stack);
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
        const uiModule = getUIModule();
        
        if (chatModule && chatModule.sendMessage) {
            // Usa Chat.sendMessage
            await chatModule.sendMessage(message);
    } else {
            throw new Error('Nenhum método disponível para enviar mensagem');
        }
    } catch (error) {
        debugError('Erro ao enviar mensagem:', error);
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
    
    // Verifica se é grupo e mostra nome do remetente
    const chatModule = getChatModule();
    const chatInfo = chatModule && chatModule.getCurrentChatInfo ? chatModule.getCurrentChatInfo() : null;
    
            // Verifica isGroup em _chat.isGroup ou isGroup direto
            const isGroup = chatInfo ? (chatInfo._chat?.isGroup ?? chatInfo.isGroup) : false;
            
            // Log de erro se não conseguir determinar se é grupo
            if (chatInfo === null) {
                debugError('❌ ERRO: Não foi possível determinar se a conversa é um grupo. chatInfo é null.');
            } else if (typeof isGroup === 'undefined') {
                debugError('❌ ERRO: Campo isGroup não encontrado em chatInfo.isGroup nem em chatInfo._chat.isGroup. Estrutura:', {
                    hasIsGroup: typeof chatInfo.isGroup !== 'undefined',
                    has_chat: !!chatInfo._chat,
                    has_chat_isGroup: typeof chatInfo._chat?.isGroup !== 'undefined',
                    chatKeys: Object.keys(chatInfo),
                    chat_chatKeys: chatInfo._chat ? Object.keys(chatInfo._chat) : null
                });
            }
    const showSenderName = isGroup && !message.fromMe;
    
    // Tenta obter o nome do remetente de várias fontes
    let senderName = '';
    if (showSenderName) {
        senderName = message.contact?.pushName || 
                    message.contact?.name || 
                    message.author?.pushName || 
                    message.author?.name || 
                    message.notifyName ||
                    message.fromName ||
                    (message.from ? message.from.split('@')[0] : '') || 
                    null;
        
        // Log de erro se não conseguir encontrar o nome
        if (!senderName) {
            debugError('❌ ERRO: Não foi possível encontrar o nome ou número do contato. Estrutura da mensagem:', {
                hasContact: !!message.contact,
                contact: message.contact,
                hasAuthor: !!message.author,
                author: message.author,
                notifyName: message.notifyName,
                fromName: message.fromName,
                from: message.from,
                messageKeys: Object.keys(message)
            });
            senderName = message.from ? message.from.split('@')[0] : 'Desconhecido';
        }
    }
    
    return `
        <div class="message ${message.fromMe ? 'sent' : 'received'}">
            <div class="message-content">
                ${showSenderName ? `<div class="message-sender">${senderName}</div>` : ''}
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
    // Conecta WebSocket
    if (typeof WebSocket !== 'undefined' && WebSocket.connectWebSocket) {
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
    if (generateQRBtn) generateQRBtn.onclick = generateQR;
    if (startSessionBtn) startSessionBtn.onclick = startSession;
    if (stopSessionBtn) stopSessionBtn.onclick = stopSession;
    if (showChatBtn) showChatBtn.onclick = showChat;
    if (sessionSettingsBtn) sessionSettingsBtn.onclick = showSessionSettings;
    if (logoutBtn) logoutBtn.onclick = logout;
    if (sendBtn) sendBtn.onclick = sendMessage;
    
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
    
    // Inicializa interface
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
});
