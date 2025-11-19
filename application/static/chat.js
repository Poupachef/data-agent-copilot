/**
 * Módulo de gerenciamento de chats e mensagens.
 * Controla exibição e manipulação de conversas.
 */

console.log('📱 chat.js carregando...');

const DEFAULT_SESSION = 'default';
let currentChat = null;

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
                return await apiModule.getChats(DEFAULT_SESSION);
            }
            return [];
        } catch (error) {
            console.error('Erro ao carregar chats:', error);
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
            if (apiModule && apiModule.getMessages) {
                const messages = await apiModule.getMessages(DEFAULT_SESSION, chatId);
                if (renderMessages) renderMessages(messages);
            }
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
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
                await apiModule.sendTextMessage(DEFAULT_SESSION, currentChat, text.trim());
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
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
        const messageText = message.body || message.text || '';
        const time = message.timestamp ? Chat.formatMessageTime(message.timestamp) : '';
        const hasMedia = message.hasMedia && message.media && message.media.url;
        const mediaHtml = hasMedia ? Chat.renderMediaHtml(message.media) : '';
        
        return `
            <div class="message ${message.fromMe ? 'sent' : 'received'}">
                <div class="message-content">
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
        return chats.map(chat => {
            const chatId = chat.id._serialized || chat.id;
            if (!chatId) return '';

            const name = chat.name || chatId.split('@')[0] || 'Desconhecido';
            const lastMsg = chat.lastMessage;
            const lastMsgText = lastMsg?.body || '';
            const lastMsgTime = lastMsg?.timestamp
                ? Chat.formatMessageTime(lastMsg.timestamp)
                : '';
            const unread = chat.unreadCount > 0
                ? `<span class="unread-badge">${chat.unreadCount}</span>`
                : '';
            const ackIcon = Chat.getAckIcon(lastMsg?.ack, lastMsg?.fromMe);

            return `
                <div class="chat-item" data-chat-id="${chatId}" onclick="window.selectChat('${chatId}'); event.stopPropagation(); return false;">
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
};

// Expõe globalmente
window.Chat = Chat;
console.log('✅ Chat exposto globalmente:', typeof window.Chat);
