/**
 * Módulo de dados mockados para teste da interface.
 * Simula conversas e mensagens do WhatsApp sem conexão real.
 */

console.log('📱 mock.js carregando...');

// Dados mockados de conversas
const MOCK_CHATS = [
    {
        id: { _serialized: "5511999999999@c.us" },
        name: "João Silva",
        unreadCount: 2,
        lastMessage: {
            body: "Obrigado pela ajuda!",
            timestamp: Math.floor(Date.now() / 1000) - 300, // 5 minutos atrás
            fromMe: false,
            ack: 3
        }
    },
    {
        id: { _serialized: "5511888888888@c.us" },
        name: "Maria Santos",
        unreadCount: 0,
        lastMessage: {
            body: "Perfeito, entendi!",
            timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hora atrás
            fromMe: true,
            ack: 2
        }
    },
    {
        id: { _serialized: "5511777777777@c.us" },
        name: "Pedro Oliveira",
        unreadCount: 1,
        lastMessage: {
            body: "Pode me ajudar com uma dúvida?",
            timestamp: Math.floor(Date.now() / 1000) - 7200, // 2 horas atrás
            fromMe: false,
            ack: 1
        }
    }
];

// Mensagens mockadas por chat
const MOCK_MESSAGES = {
    "5511999999999@c.us": [
        {
            id: "msg1",
            body: "Olá! Preciso de ajuda com meu pedido.",
            timestamp: Math.floor(Date.now() / 1000) - 1800,
            fromMe: false,
            hasMedia: false
        },
        {
            id: "msg2",
            body: "Claro! Como posso ajudar?",
            timestamp: Math.floor(Date.now() / 1000) - 1700,
            fromMe: true,
            hasMedia: false,
            ack: 3
        },
        {
            id: "msg3",
            body: "Meu pedido #12345 ainda não chegou.",
            timestamp: Math.floor(Date.now() / 1000) - 1600,
            fromMe: false,
            hasMedia: false
        },
        {
            id: "msg4",
            body: "Vou verificar o status para você. Um momento...",
            timestamp: Math.floor(Date.now() / 1000) - 1500,
            fromMe: true,
            hasMedia: false,
            ack: 3
        },
        {
            id: "msg5",
            body: "Obrigado pela ajuda!",
            timestamp: Math.floor(Date.now() / 1000) - 300,
            fromMe: false,
            hasMedia: false
        }
    ],
    "5511888888888@c.us": [
        {
            id: "msg6",
            body: "Bom dia!",
            timestamp: Math.floor(Date.now() / 1000) - 4000,
            fromMe: false,
            hasMedia: false
        },
        {
            id: "msg7",
            body: "Bom dia! Em que posso ajudar?",
            timestamp: Math.floor(Date.now() / 1000) - 3900,
            fromMe: true,
            hasMedia: false,
            ack: 3
        },
        {
            id: "msg8",
            body: "Queria saber sobre os produtos em promoção.",
            timestamp: Math.floor(Date.now() / 1000) - 3800,
            fromMe: false,
            hasMedia: false
        },
        {
            id: "msg9",
            body: "Claro! Temos várias promoções. Vou enviar o catálogo.",
            timestamp: Math.floor(Date.now() / 1000) - 3700,
            fromMe: true,
            hasMedia: false,
            ack: 3
        },
        {
            id: "msg10",
            body: "Perfeito, entendi!",
            timestamp: Math.floor(Date.now() / 1000) - 3600,
            fromMe: true,
            hasMedia: false,
            ack: 2
        }
    ],
    "5511777777777@c.us": [
        {
            id: "msg11",
            body: "Oi!",
            timestamp: Math.floor(Date.now() / 1000) - 8000,
            fromMe: false,
            hasMedia: false
        },
        {
            id: "msg12",
            body: "Olá! Como posso ajudar?",
            timestamp: Math.floor(Date.now() / 1000) - 7900,
            fromMe: true,
            hasMedia: false,
            ack: 3
        },
        {
            id: "msg13",
            body: "Pode me ajudar com uma dúvida?",
            timestamp: Math.floor(Date.now() / 1000) - 7200,
            fromMe: false,
            hasMedia: false
        }
    ]
};

/**
 * Namespace de dados mockados.
 */
const Mock = {
    /**
     * Verifica se está em modo mockado.
     */
    isMockMode() {
        return localStorage.getItem('mockMode') === 'true';
    },

    /**
     * Ativa o modo mockado.
     */
    enableMockMode() {
        localStorage.setItem('mockMode', 'true');
    },

    /**
     * Desativa o modo mockado.
     */
    disableMockMode() {
        localStorage.setItem('mockMode', 'false');
    },

    /**
     * Obtém lista de chats mockados.
     */
    getChats() {
        return Promise.resolve(MOCK_CHATS);
    },

    /**
     * Obtém mensagens mockadas de um chat.
     */
    getMessages(chatId) {
        const messages = MOCK_MESSAGES[chatId] || [];
        return Promise.resolve(messages);
    },

    /**
     * Simula envio de mensagem.
     */
    async sendMessage(chatId, text) {
        // Simula delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Adiciona mensagem à lista mockada
        if (!MOCK_MESSAGES[chatId]) {
            MOCK_MESSAGES[chatId] = [];
        }
        
        const newMessage = {
            id: `msg_${Date.now()}`,
            body: text,
            timestamp: Math.floor(Date.now() / 1000),
            fromMe: true,
            hasMedia: false,
            ack: 1
        };
        
        MOCK_MESSAGES[chatId].push(newMessage);
        
        // Simula resposta automática após 2 segundos
        setTimeout(() => {
            const responses = [
                "Entendi!",
                "Ok, vou verificar.",
                "Perfeito!",
                "Obrigado pela mensagem!"
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            
            const responseMessage = {
                id: `msg_${Date.now()}_response`,
                body: randomResponse,
                timestamp: Math.floor(Date.now() / 1000),
                fromMe: false,
                hasMedia: false
            };
            
            MOCK_MESSAGES[chatId].push(responseMessage);
            
            // Dispara evento de nova mensagem
            if (window.mockMessageHandler) {
                window.mockMessageHandler(responseMessage, chatId);
            }
        }, 2000);
        
        return Promise.resolve({ success: true, message: newMessage });
    }
};

// Expõe globalmente
window.Mock = Mock;
console.log('✅ Mock exposto globalmente:', typeof window.Mock);

