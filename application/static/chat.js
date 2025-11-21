/**
 * Módulo de gerenciamento de chats e mensagens.
 * Controla exibição e manipulação de conversas.
 */

// Debug condicional
const CHAT_DEBUG = (() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('debug') === 'true' || localStorage.getItem('debug') === 'true';
})();

function chatDebugLog(...args) {
    if (CHAT_DEBUG) console.log('[CHAT]', ...args);
}

function chatDebugError(...args) {
    console.error('[CHAT]', ...args);
}

// Define constante local para evitar conflito com session.js
// session.js carrega antes e já define DEFAULT_SESSION
const CHAT_DEFAULT_SESSION = 'default';
let currentChat = null;
let currentChatInfo = null; // Armazena informações do chat atual (isGroup, etc.)

/**
 * Namespace de chat.
 */
const Chat = {
    /**
     * Carrega lista de chats.
     */
    async loadChats() {
        try {
            const apiModule = (typeof API !== 'undefined' ? API : null) || (typeof window.API !== 'undefined' ? window.API : null);
            if (apiModule && apiModule.getChats) {
                return await apiModule.getChats(CHAT_DEFAULT_SESSION);
            }
            return [];
        } catch (error) {
            chatDebugError('Erro ao carregar chats:', error);
            return [];
        }
    },

    /**
     * Seleciona um chat e carrega suas mensagens.
     */
    async selectChat(chatId, renderMessages) {
        currentChat = chatId;
        
        try {
            const apiModule = (typeof API !== 'undefined' ? API : null) || (typeof window.API !== 'undefined' ? window.API : null);
            
            // Busca informações do chat para saber se é grupo (ANTES de carregar mensagens)
            if (apiModule && apiModule.getChats) {
                try {
                    const chats = await apiModule.getChats(CHAT_DEFAULT_SESSION);
                    const chatInfo = chats.find(chat => {
                        const id = chat.id?._serialized || chat.id;
                        return id === chatId;
                    });
                    if (!chats || !Array.isArray(chats)) {
                        chatDebugError('❌ ERRO: getChats não retornou um array válido:', chats);
                        currentChatInfo = null;
                    } else {
                        const chatInfo = chats.find(chat => {
                            const id = chat.id?._serialized || chat.id;
                            return id === chatId;
                        });
                        if (chatInfo) {
                            currentChatInfo = chatInfo;
                            // Verifica isGroup em _chat.isGroup ou isGroup direto
                            const isGroup = chatInfo._chat?.isGroup ?? chatInfo.isGroup;
                            chatDebugLog('Chat info carregado:', { isGroup, name: chatInfo.name, has_chat: !!chatInfo._chat });
                            
                            // Log de erro se isGroup não estiver definido
                            if (typeof isGroup === 'undefined') {
                                chatDebugError('❌ ERRO: Não foi possível determinar se a conversa é um grupo. Campo isGroup não encontrado em chat.isGroup nem em chat._chat.isGroup. Estrutura do chat:', {
                                    hasIsGroup: typeof chatInfo.isGroup !== 'undefined',
                                    has_chat: !!chatInfo._chat,
                                    has_chat_isGroup: typeof chatInfo._chat?.isGroup !== 'undefined',
                                    chatKeys: Object.keys(chatInfo),
                                    chat_chatKeys: chatInfo._chat ? Object.keys(chatInfo._chat) : null
                                });
                            }
                        } else {
                            chatDebugError('❌ ERRO: Chat não encontrado na lista. chatId:', chatId, 'Chats disponíveis:', chats.map(c => c.id?._serialized || c.id));
                            currentChatInfo = null;
                        }
                    }
                } catch (e) {
                    chatDebugError('❌ ERRO ao buscar info do chat:', e);
                    currentChatInfo = null;
                }
            } else {
                chatDebugError('❌ ERRO: API module ou getChats não disponível');
                currentChatInfo = null;
            }
            
            // Agora carrega as mensagens (já com as informações do chat disponíveis)
            if (apiModule && apiModule.getMessages) {
                const messages = await apiModule.getMessages(CHAT_DEFAULT_SESSION, chatId);
                
                // Log de origem das mensagens da API
                console.log('[CHAT] 📡 Mensagens recebidas da API:', {
                    chatId: chatId,
                    total: messages?.length || 0,
                    source: 'Chat.selectChat -> API.getMessages',
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
                
                // Ordena mensagens por timestamp antes de renderizar
                if (messages && Array.isArray(messages)) {
                    const sortedMessages = messages.sort((a, b) => {
                        const timestampA = a.timestamp || 0;
                        const timestampB = b.timestamp || 0;
                        return timestampA - timestampB;
                    });
                    if (renderMessages) {
                        chatDebugLog('Renderizando mensagens. isGroup:', currentChatInfo?.isGroup);
                        renderMessages(sortedMessages);
                    }
                } else if (renderMessages) {
                    renderMessages(messages);
                }
            }
        } catch (error) {
            chatDebugError('Erro ao carregar mensagens:', error);
        }
    },

    /**
     * Envia uma mensagem de texto.
     */
    async sendMessage(text) {
        if (!currentChat || !text.trim()) return;
        
        try {
            const apiModule = (typeof API !== 'undefined' ? API : null) || (typeof window.API !== 'undefined' ? window.API : null);
            if (apiModule && apiModule.sendTextMessage) {
                await apiModule.sendTextMessage(CHAT_DEFAULT_SESSION, currentChat, text.trim());
            }
        } catch (error) {
            chatDebugError('Erro ao enviar mensagem:', error);
            throw error;
        }
    },

    /**
     * Obtém o chat atual.
     */
    getCurrentChat() {
        return currentChat;
    },

    /**
     * Define o chat atual.
     */
    setCurrentChat(chatId) {
        currentChat = chatId;
        // Limpa informações do chat anterior
        currentChatInfo = null;
    },
    
    /**
     * Define informações do chat atual.
     */
    setCurrentChatInfo(chatInfo) {
        currentChatInfo = chatInfo;
    },
    
    /**
     * Obtém informações do chat atual.
     */
    getCurrentChatInfo() {
        return currentChatInfo;
    },

    /**
     * Formata timestamp para exibição.
     */
    formatMessageTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Obtém ícone de confirmação de leitura.
     */
    getAckIcon(ack, fromMe) {
        if (!fromMe) return '';
        if (ack === 1) return '<span class="msg-ack">✓</span>';
        if (ack === 2) return '<span class="msg-ack">✓✓</span>';
        if (ack === 3) return '<span class="msg-ack msg-ack-read">✓✓</span>';
        return '';
    },

    /**
     * Renderiza HTML de mídia.
     */
    renderMediaHtml(media) {
        if (!media || !media.url) return '';
        
        const mediaUrl = media.url.replace('http://localhost:3000', 'http://localhost:8001');
        
        if (media.mimetype && media.mimetype.startsWith('image/')) {
            return `<div class="message-media"><img src="${mediaUrl}" alt="Image" onerror="this.style.display='none'"></div>`;
        }
        return `<div class="message-media"><div class="media-placeholder">📎 ${media.filename || 'Arquivo'}</div></div>`;
    },

    /**
     * Cria HTML de uma mensagem.
     */
    createMessageHtml(message) {
        let messageText = message.body || message.text || '';
        const time = message.timestamp ? Chat.formatMessageTime(message.timestamp) : '';
        const hasMedia = message.hasMedia && message.media && message.media.url;
        const mediaHtml = hasMedia ? Chat.renderMediaHtml(message.media) : '';
        
        // Se não há conteúdo (nem texto nem mídia), adiciona log detalhado para debug
        if (!messageText && !hasMedia) {
            console.error('🚨 MENSAGEM FANTASMA DETECTADA - Sem conteúdo:', {
                messageId: message.id,
                timestamp: message.timestamp,
                time: time,
                fromMe: message.fromMe,
                from: message.from,
                to: message.to,
                hasBody: !!message.body,
                body: message.body,
                hasText: !!message.text,
                text: message.text,
                hasMedia: message.hasMedia,
                media: message.media,
                messageType: message.type,
                messageSubtype: message.subtype,
                allKeys: Object.keys(message),
                fullMessage: JSON.stringify(message, null, 2),
                stackTrace: new Error().stack
            });
            chatDebugError('🚨 MENSAGEM FANTASMA - Estrutura completa:', message);
            
            // Adiciona texto de debug na mensagem para visualização
            messageText = `[MENSAGEM FANTASMA - ID: ${message.id || 'sem-id'}, Tipo: ${message.type || 'sem-tipo'}, Timestamp: ${time}]`;
        }
        
        // Verifica se é grupo - pode estar em _chat.isGroup ou isGroup direto
        const isGroup = currentChatInfo ? (currentChatInfo._chat?.isGroup ?? currentChatInfo.isGroup) : false;
        
        // Log de erro se não conseguir determinar se é grupo
        if (currentChatInfo === null) {
            chatDebugError('❌ ERRO: Não foi possível determinar se a conversa é um grupo. currentChatInfo é null.');
        } else if (typeof isGroup === 'undefined') {
            chatDebugError('❌ ERRO: Campo isGroup não encontrado em currentChatInfo.isGroup nem em currentChatInfo._chat.isGroup. Estrutura:', {
                hasIsGroup: typeof currentChatInfo.isGroup !== 'undefined',
                has_chat: !!currentChatInfo._chat,
                has_chat_isGroup: typeof currentChatInfo._chat?.isGroup !== 'undefined',
                chatKeys: Object.keys(currentChatInfo),
                chat_chatKeys: currentChatInfo._chat ? Object.keys(currentChatInfo._chat) : null
            });
        }
        
        const showSenderName = isGroup && !message.fromMe;
        
        // Tenta obter o nome do remetente de várias fontes
        let senderName = '';
        if (showSenderName) {
            // Tenta várias fontes de nome
            senderName = message.contact?.pushName || 
                        message.contact?.name || 
                        message.author?.pushName || 
                        message.author?.name || 
                        message.notifyName ||
                        message.fromName ||
                        null;
            
            // Se não encontrou nome, tenta extrair do campo 'from'
            if (!senderName && message.from) {
                const fromId = message.from.split('@')[0];
                // Verifica se parece um número de telefone (começa com código de país, tem 10-15 dígitos)
                // IDs internos do WhatsApp geralmente são muito longos (15+ dígitos) e não começam com código de país comum
                const isPhoneNumber = /^[1-9]\d{9,14}$/.test(fromId) && fromId.length <= 15;
                
                if (isPhoneNumber) {
                    senderName = fromId;
                } else {
                    // É um ID interno do WhatsApp, não mostra o ID bruto
                    senderName = 'Membro do grupo';
                    chatDebugLog('ID interno detectado, usando "Membro do grupo":', { from: message.from, fromId });
                }
            }
            
            // Fallback final
            if (!senderName) {
                senderName = 'Desconhecido';
                chatDebugError('❌ ERRO: Não foi possível encontrar o nome ou número do contato. Estrutura da mensagem:', {
                    hasContact: !!message.contact,
                    contact: message.contact,
                    hasAuthor: !!message.author,
                    author: message.author,
                    notifyName: message.notifyName,
                    fromName: message.fromName,
                    from: message.from,
                    messageKeys: Object.keys(message)
                });
            } else {
                chatDebugLog('Nome do remetente encontrado:', { 
                    senderName, 
                    source: message.contact?.pushName ? 'contact.pushName' :
                            message.contact?.name ? 'contact.name' :
                            message.author?.pushName ? 'author.pushName' :
                            message.author?.name ? 'author.name' :
                            message.notifyName ? 'notifyName' :
                            message.fromName ? 'fromName' :
                            (message.from && /^[1-9]\d{9,14}$/.test(message.from.split('@')[0]) && message.from.split('@')[0].length <= 15) ? 'from (número)' :
                            'from (ID interno - usando "Membro do grupo")',
                    from: message.from 
                });
            }
        }
        
        return `
            <div class="message ${message.fromMe ? 'sent' : 'received'}">
                <div class="message-content">
                    ${showSenderName ? `<div class="message-sender">${senderName}</div>` : ''}
                    ${mediaHtml}
                    ${messageText ? `<div class="message-text">${messageText}</div>` : ''}
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    },

    /**
     * Renderiza lista de chats.
     */
    renderChats(chats, onChatSelect) {
        const currentChatId = Chat.getCurrentChat();
        
        return chats.map(chat => {
            const chatId = chat.id._serialized || chat.id;
            if (!chatId) return '';

            const name = chat.name || chatId.split('@')[0] || 'Desconhecido';
            const lastMsg = chat.lastMessage;
            const lastMsgText = lastMsg?.body || '';
            const lastMsgTime = lastMsg?.timestamp
                ? Chat.formatMessageTime(lastMsg.timestamp)
                : '';
            // Verifica unreadCount em diferentes possíveis locais
            const unreadCount = chat.unreadCount ?? 
                               chat.unread ?? 
                               (chat._chat?.unreadCount) ?? 
                               (chat._chat?.unread) ?? 
                               0;
            
            // Debug para verificar unreadCount
            if (unreadCount > 0) {
                chatDebugLog('Conversa não lida detectada:', { 
                    name, 
                    chatId, 
                    unreadCount, 
                    chatUnreadCount: chat.unreadCount,
                    chatUnread: chat.unread,
                    chat_chat_unreadCount: chat._chat?.unreadCount,
                    chat_chat_unread: chat._chat?.unread
                });
            }
            
            const unread = unreadCount > 0
                ? `<span class="unread-badge">${unreadCount}</span>`
                : '';
            const ackIcon = Chat.getAckIcon(lastMsg?.ack, lastMsg?.fromMe);

            // Verifica isGroup em _chat.isGroup ou isGroup direto (mesma lógica usada em outras partes)
            const isGroup = chat._chat?.isGroup ?? chat.isGroup ?? false;
            const avatarIcon = isGroup ? '👥' : '👤';
            
            // Debug para verificar detecção de grupos
            if (isGroup) {
                chatDebugLog('Grupo detectado:', { name, chatId, unreadCount, isGroup });
            }
            
            // Determina a classe CSS baseada nas regras
            let statusClass = '';
            const isActive = currentChatId === chatId;
            
            chatDebugLog('Determinando classe CSS:', { 
                name, 
                chatId, 
                isActive, 
                isGroup, 
                unreadCount, 
                lastMsgFromMe: lastMsg?.fromMe 
            });
            
            // Se está ativo, não aplica outras classes (active tem prioridade)
            if (!isActive) {
                if (isGroup) {
                    // Grupo onde a última mensagem não foi lida por mim: fundo verde escuro
                    if (unreadCount > 0) {
                        statusClass = 'group-unread';
                        chatDebugLog('Aplicando classe group-unread (verde escuro)');
                    } else {
                        // Grupo onde última mensagem foi lida por mim: fundo verde claro
                        statusClass = 'group-read';
                        chatDebugLog('Aplicando classe group-read (verde claro)');
                    }
            } else {
                // Conversa individual
                if (unreadCount > 0) {
                    // Conversa não lida: fundo rosa escuro
                    statusClass = 'unread';
                    chatDebugLog('Aplicando classe unread (rosa escuro)');
                } else if (lastMsg) {
                    if (lastMsg.fromMe) {
                        // Conversa lida e respondida (última mensagem enviada por mim): fundo cinza
                        statusClass = 'sent';
                        chatDebugLog('Aplicando classe sent (cinza - lida e respondida)');
                    } else {
                        // Conversa lida e não respondida (última mensagem recebida): fundo rosa claro
                        statusClass = 'received';
                        chatDebugLog('Aplicando classe received (rosa claro - lida mas não respondida)');
                    }
                }
            }
            }
            
            // Monta as classes: active sempre por último para ter prioridade
            const classes = ['chat-item', statusClass, isActive ? 'active' : ''].filter(c => c).join(' ');
            
            return `
                <div class="${classes}" data-chat-id="${chatId}" onclick="window.selectChat('${chatId}'); event.stopPropagation(); return false;">
                    <div class="chat-avatar">
                        <div class="avatar-placeholder">${avatarIcon}</div>
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
};

// Expõe globalmente
window.Chat = Chat;
chatDebugLog('✅ Chat exposto globalmente:', typeof window.Chat);
