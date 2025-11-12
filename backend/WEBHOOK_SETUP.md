# Configuração de Webhooks

Este guia explica como configurar webhooks para receber eventos do WhatsApp através do Waha API.

## Visão Geral

O backend implementa um sistema completo de webhooks que pode receber e processar todos os tipos de eventos do Waha API, incluindo:

- **Mensagens**: `message`, `message.any`, `message.ack`, `message.reaction`, `message.waiting`, `message.edited`, `message.revoked`
- **Sessões**: `session.status`
- **Chats**: `chat.archive`
- **Grupos**: `group.v2.join`, `group.v2.leave`, `group.v2.participants`, `group.v2.update`
- **Presença**: `presence.update`
- **Enquetes**: `poll.vote`, `poll.vote.failed`
- **Etiquetas**: `label.upsert`, `label.deleted`, `label.chat.added`, `label.chat.deleted`
- **Chamadas**: `call.received`, `call.accepted`, `call.rejected`
- **Engine**: `engine.event`

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` no diretório `backend/` com as seguintes configurações:

```env
# Configurações básicas
WAHA_URL=http://localhost:3001
BACKEND_PORT=8001
BACKEND_HOST=0.0.0.0

# Configurações de webhook
WEBHOOK_SECRET=seu-secret-key-aqui
WEBHOOK_ENABLE_HMAC=true
WEBHOOK_EVENTS=message,message.any,message.ack,session.status

# Configurações de logging
LOG_LEVEL=INFO
DEBUG=false
```

### 2. Configuração do Waha

Para configurar webhooks no Waha, você tem duas opções:

#### Opção A: Configuração por Sessão

Ao iniciar uma sessão, inclua a configuração de webhook:

```json
{
  "name": "default",
  "config": {
    "webhooks": [
      {
        "url": "http://localhost:8001/webhook",
        "events": [
          "message",
          "message.any",
          "message.ack",
          "session.status"
        ],
        "hmac": {
          "key": "seu-secret-key-aqui"
        },
        "retries": {
          "policy": "constant",
          "delaySeconds": 2,
          "attempts": 15
        }
      }
    ]
  }
}
```

#### Opção B: Configuração Global (Variáveis de Ambiente)

Configure as variáveis de ambiente no container do Waha:

```env
WHATSAPP_HOOK_URL=http://localhost:8001/webhook
WHATSAPP_HOOK_EVENTS=message,message.any,message.ack,session.status
WHATSAPP_HOOK_HMAC_KEY=seu-secret-key-aqui
WHATSAPP_HOOK_RETRIES_POLICY=constant
WHATSAPP_HOOK_RETRIES_DELAY_SECONDS=2
WHATSAPP_HOOK_RETRIES_ATTEMPTS=15
```

## Endpoints de Webhook

### Endpoint Principal

- **URL**: `POST /webhook`
- **Descrição**: Recebe todos os tipos de eventos
- **Autenticação**: HMAC SHA-512 (opcional)
- **Headers**: 
  - `X-Webhook-Request-Id`: ID único da requisição
  - `X-Webhook-Timestamp`: Timestamp em milissegundos
  - `X-Webhook-Hmac`: Assinatura HMAC (se habilitada)
  - `X-Webhook-Hmac-Algorithm`: Algoritmo HMAC (sha512)

### Endpoints Legados (Compatibilidade)

- `POST /webhook/message` - Eventos de mensagem
- `POST /webhook/message.ack` - Confirmações de mensagem
- `POST /webhook/session.status` - Status da sessão
- `POST /webhook/chat.archive` - Arquivo de chat

## Autenticação HMAC

O backend suporta autenticação HMAC para verificar a origem dos webhooks:

1. **Habilitar**: Configure `WEBHOOK_ENABLE_HMAC=true`
2. **Secret Key**: Configure `WEBHOOK_SECRET` com sua chave secreta
3. **Algoritmo**: Atualmente suporta apenas SHA-512

### Exemplo de Verificação

```python
# O backend verifica automaticamente:
# - X-Webhook-Hmac header
# - X-Webhook-Hmac-Algorithm header
# - Corpo da requisição
# - Chave secreta configurada
```

## Processamento de Eventos

Cada evento recebido é:

1. **Validado**: Verificação HMAC (se habilitada)
2. **Processado**: Extração e log dos dados relevantes
3. **Broadcast**: Enviado para todos os clientes WebSocket conectados
4. **Respondido**: Retorna status 200 OK

### Exemplo de Log

```
📨 Webhook recebido:
   Evento: message
   Sessão: default
   ID: evt_1234567890abcdef
   Timestamp: 1741249702485
   Request ID: req_1234567890abcdef

💬 Nova mensagem recebida:
   ID: true_1234567890@c.us_ABCDEF123456
   De: 1234567890@c.us
   Conteúdo: Olá! Como você está?
   Tem mídia: false

📡 Broadcast: message → 2 clientes conectados
```

## Configuração de Eventos

Você pode configurar quais eventos processar através da variável `WEBHOOK_EVENTS`:

```env
# Processar apenas eventos específicos
WEBHOOK_EVENTS=message,session.status

# Processar todos os eventos
WEBHOOK_EVENTS=*

# Processar eventos de mensagem e sessão
WEBHOOK_EVENTS=message,message.any,message.ack,session.status
```

## Testando Webhooks

### 1. Usando curl

```bash
# Teste básico
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"message","session":"default","payload":{"id":"test","from":"123@c.us","body":"Teste"}}'

# Teste com HMAC
curl -X POST http://localhost:8001/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Hmac: assinatura-hmac-aqui" \
  -H "X-Webhook-Hmac-Algorithm: sha512" \
  -d '{"event":"message","session":"default","payload":{"id":"test","from":"123@c.us","body":"Teste"}}'
```

### 2. Usando webhook.site

1. Acesse https://webhook.site
2. Copie a URL fornecida
3. Configure no Waha como URL de webhook
4. Monitore as requisições em tempo real

### 3. Verificando Logs

O backend registra todos os eventos recebidos:

```bash
# Acompanhar logs em tempo real
tail -f backend/logs/app.log
```

## Troubleshooting

### Problema: Webhook não está sendo recebido

1. **Verifique a URL**: Confirme que a URL está correta e acessível
2. **Verifique a rede**: Teste conectividade entre Waha e backend
3. **Verifique logs**: Acompanhe logs do Waha e do backend
4. **Teste manual**: Use curl para testar o endpoint

### Problema: HMAC falhando

1. **Verifique a chave**: Confirme que `WEBHOOK_SECRET` está igual em ambos os lados
2. **Verifique o algoritmo**: Atualmente só SHA-512 é suportado
3. **Desabilite temporariamente**: Configure `WEBHOOK_ENABLE_HMAC=false` para debug

### Problema: Eventos não sendo processados

1. **Verifique configuração**: Confirme `WEBHOOK_EVENTS` inclui os eventos desejados
2. **Verifique logs**: Acompanhe logs para ver se eventos estão sendo recebidos
3. **Teste endpoint**: Use curl para testar manualmente

## Exemplos de Uso

### Configuração Completa

```python
# Exemplo de configuração completa para produção
WEBHOOK_SECRET = "minha-chave-super-secreta-123"
WEBHOOK_ENABLE_HMAC = True
WEBHOOK_EVENTS = [
    "message",
    "message.any", 
    "message.ack",
    "session.status",
    "chat.archive",
    "group.v2.join",
    "group.v2.leave"
]
```

### Integração com Frontend

O frontend pode receber eventos via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8001/ws/default');

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Evento recebido:', data.event, data.data);
    
    if (data.event === 'message') {
        // Processar nova mensagem
        displayMessage(data.data);
    } else if (data.event === 'session.status') {
        // Atualizar status da sessão
        updateSessionStatus(data.data);
    }
};
```

## Segurança

1. **Use HTTPS em produção**: Configure SSL/TLS para webhooks
2. **Use chaves secretas fortes**: Gere chaves HMAC seguras
3. **Valide origem**: Sempre verifique HMAC em produção
4. **Rate limiting**: Considere implementar rate limiting
5. **Logs seguros**: Não logue dados sensíveis

## Monitoramento

O backend fornece logs detalhados para monitoramento:

- ✅ Eventos recebidos com sucesso
- ⚠️ Avisos sobre eventos desconhecidos
- ❌ Erros de processamento
- 🔓 Status de autenticação HMAC
- 📡 Broadcast para clientes WebSocket 