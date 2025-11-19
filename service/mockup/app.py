"""
Mockup do Waha API.
Simula o comportamento do Waha para desenvolvimento e testes.
Foca em simular o estágio inicial onde recuperamos mensagens já existentes.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, Response
from typing import Dict, List, Any, Optional
import time
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

app = FastAPI(title="Waha Mockup API", description="Mockup da API Waha para desenvolvimento")

# Estado das sessões - mantém o status real das sessões
session_state: Dict[str, Dict[str, Any]] = {
    "default": {
        "name": "default",
        "status": "WORKING",
        "engine": "WEBJS",
        "me": {
            "id": "5511999999999@c.us",
            "pushName": "Usuário Mock"
        }
    }
}

# Dados mockados - template base
MOCK_SESSION_TEMPLATE = {
    "name": "default",
    "status": "WORKING",
    "engine": "WEBJS",
    "me": {
        "id": "5511999999999@c.us",
        "pushName": "Usuário Mock"
    }
}

MOCK_CHATS = [
    {
        "id": {"_serialized": "5511999999999@c.us"},
        "name": "João Silva",
        "unreadCount": 2,
        "lastMessage": {
            "id": "msg5",
            "body": "Obrigado pela ajuda!",
            "timestamp": int(time.time()) - 300,
            "fromMe": False,
            "ack": 1
        },
        "isGroup": False,
        "isMuted": False,
        "isArchived": False
    },
    {
        "id": {"_serialized": "5511888888888@c.us"},
        "name": "Maria Santos",
        "unreadCount": 0,
        "lastMessage": {
            "id": "msg10",
            "body": "Perfeito, entendi!",
            "timestamp": int(time.time()) - 3600,
            "fromMe": True,
            "ack": 2
        },
        "isGroup": False,
        "isMuted": False,
        "isArchived": False
    },
    {
        "id": {"_serialized": "5511777777777@c.us"},
        "name": "Pedro Oliveira",
        "unreadCount": 1,
        "lastMessage": {
            "id": "msg13",
            "body": "Pode me ajudar com uma dúvida?",
            "timestamp": int(time.time()) - 7200,
            "fromMe": False,
            "ack": 1
        },
        "isGroup": False,
        "isMuted": False,
        "isArchived": False
    }
]

MOCK_MESSAGES: Dict[str, List[Dict[str, Any]]] = {
    "5511999999999@c.us": [
        {
            "id": "msg1",
            "body": "Olá! Preciso de ajuda com meu pedido.",
            "timestamp": int(time.time()) - 1800,
            "from": "5511999999999@c.us",
            "fromMe": False,
            "to": "5511999999999@c.us",
            "hasMedia": False,
            "ack": 1
        },
        {
            "id": "msg2",
            "body": "Claro! Como posso ajudar?",
            "timestamp": int(time.time()) - 1700,
            "from": "5511999999999@c.us",
            "fromMe": True,
            "to": "5511999999999@c.us",
            "hasMedia": False,
            "ack": 3
        },
        {
            "id": "msg3",
            "body": "Meu pedido #12345 ainda não chegou.",
            "timestamp": int(time.time()) - 1600,
            "from": "5511999999999@c.us",
            "fromMe": False,
            "to": "5511999999999@c.us",
            "hasMedia": False,
            "ack": 1
        },
        {
            "id": "msg4",
            "body": "Vou verificar o status para você. Um momento...",
            "timestamp": int(time.time()) - 1500,
            "from": "5511999999999@c.us",
            "fromMe": True,
            "to": "5511999999999@c.us",
            "hasMedia": False,
            "ack": 3
        },
        {
            "id": "msg5",
            "body": "Obrigado pela ajuda!",
            "timestamp": int(time.time()) - 300,
            "from": "5511999999999@c.us",
            "fromMe": False,
            "to": "5511999999999@c.us",
            "hasMedia": False,
            "ack": 1
        }
    ],
    "5511888888888@c.us": [
        {
            "id": "msg6",
            "body": "Bom dia!",
            "timestamp": int(time.time()) - 4000,
            "from": "5511888888888@c.us",
            "fromMe": False,
            "to": "5511888888888@c.us",
            "hasMedia": False,
            "ack": 1
        },
        {
            "id": "msg7",
            "body": "Bom dia! Em que posso ajudar?",
            "timestamp": int(time.time()) - 3900,
            "from": "5511888888888@c.us",
            "fromMe": True,
            "to": "5511888888888@c.us",
            "hasMedia": False,
            "ack": 3
        },
        {
            "id": "msg8",
            "body": "Queria saber sobre os produtos em promoção.",
            "timestamp": int(time.time()) - 3800,
            "from": "5511888888888@c.us",
            "fromMe": False,
            "to": "5511888888888@c.us",
            "hasMedia": False,
            "ack": 1
        },
        {
            "id": "msg9",
            "body": "Claro! Temos várias promoções. Vou enviar o catálogo.",
            "timestamp": int(time.time()) - 3700,
            "from": "5511888888888@c.us",
            "fromMe": True,
            "to": "5511888888888@c.us",
            "hasMedia": False,
            "ack": 3
        },
        {
            "id": "msg10",
            "body": "Perfeito, entendi!",
            "timestamp": int(time.time()) - 3600,
            "from": "5511888888888@c.us",
            "fromMe": True,
            "to": "5511888888888@c.us",
            "hasMedia": False,
            "ack": 2
        }
    ],
    "5511777777777@c.us": [
        {
            "id": "msg11",
            "body": "Oi!",
            "timestamp": int(time.time()) - 8000,
            "from": "5511777777777@c.us",
            "fromMe": False,
            "to": "5511777777777@c.us",
            "hasMedia": False,
            "ack": 1
        },
        {
            "id": "msg12",
            "body": "Olá! Como posso ajudar?",
            "timestamp": int(time.time()) - 7900,
            "from": "5511777777777@c.us",
            "fromMe": True,
            "to": "5511777777777@c.us",
            "hasMedia": False,
            "ack": 3
        },
        {
            "id": "msg13",
            "body": "Pode me ajudar com uma dúvida?",
            "timestamp": int(time.time()) - 7200,
            "from": "5511777777777@c.us",
            "fromMe": False,
            "to": "5511777777777@c.us",
            "hasMedia": False,
            "ack": 1
        }
    ]
}


def generate_qr_code() -> bytes:
    """Gera um QR code mockado (imagem PNG simples)."""
    # Cria uma imagem simples com um padrão que simula um QR code
    img = Image.new('RGB', (200, 200), color='white')
    draw = ImageDraw.Draw(img)
    
    # Desenha um padrão simples que parece um QR code
    for i in range(0, 200, 10):
        for j in range(0, 200, 10):
            if (i + j) % 20 < 10:
                draw.rectangle([i, j, i+10, j+10], fill='black')
    
    # Salva em bytes
    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    return img_bytes.getvalue()


# Health check endpoints
@app.get("/ping")
async def ping():
    """Health check endpoint."""
    return JSONResponse({"status": "ok"})


@app.get("/health")
async def health():
    """Health check endpoint."""
    return JSONResponse({"status": "healthy"})


def get_session_status(session: str) -> Dict[str, Any]:
    """Obtém o status atual de uma sessão."""
    if session in session_state:
        return session_state[session]
    return None


# Session endpoints
@app.get("/api/sessions")
async def list_sessions():
    """Lista todas as sessões."""
    return JSONResponse(list(session_state.values()))


@app.get("/api/sessions/{session}")
async def get_session(session: str):
    """Obtém informações de uma sessão."""
    session_data = get_session_status(session)
    if session_data:
        return JSONResponse(session_data)
    raise HTTPException(status_code=404, detail="Session not found")


@app.post("/api/sessions")
async def create_session(data: Dict[str, Any] = None):
    """Cria uma nova sessão."""
    session_name = data.get("name", "default") if data else "default"
    
    # Se a sessão já existe, retorna ela
    if session_name in session_state:
        return JSONResponse(session_state[session_name])
    
    # Cria nova sessão
    new_session = MOCK_SESSION_TEMPLATE.copy()
    new_session["name"] = session_name
    new_session["status"] = "STOPPED"
    session_state[session_name] = new_session
    
    return JSONResponse(new_session)


@app.delete("/api/sessions/{session}")
async def delete_session(session: str):
    """Deleta uma sessão."""
    if session in session_state:
        del session_state[session]
        return JSONResponse({"status": "deleted"})
    raise HTTPException(status_code=404, detail="Session not found")


@app.post("/api/sessions/{session}/start")
async def start_session(session: str):
    """Inicia uma sessão."""
    if session not in session_state:
        # Cria sessão se não existir
        session_state[session] = MOCK_SESSION_TEMPLATE.copy()
        session_state[session]["name"] = session
    
    session_state[session]["status"] = "WORKING"
    return JSONResponse(session_state[session])


@app.post("/api/sessions/{session}/stop")
async def stop_session(session: str):
    """Para uma sessão."""
    session_data = get_session_status(session)
    if session_data:
        session_data["status"] = "STOPPED"
        return JSONResponse(session_data)
    raise HTTPException(status_code=404, detail="Session not found")


@app.post("/api/sessions/{session}/logout")
async def logout_session(session: str):
    """Faz logout de uma sessão."""
    session_data = get_session_status(session)
    if session_data:
        session_data["status"] = "STOPPED"
        return JSONResponse(session_data)
    raise HTTPException(status_code=404, detail="Session not found")


@app.put("/api/sessions/{session}")
async def update_session(session: str, data: Dict[str, Any] = None):
    """Atualiza configuração de uma sessão."""
    session_data = get_session_status(session)
    if session_data:
        if data:
            # Atualiza campos se fornecidos
            if "config" in data:
                session_data.setdefault("config", {}).update(data["config"])
        return JSONResponse(session_data)
    raise HTTPException(status_code=404, detail="Session not found")


# Auth endpoints
@app.get("/api/{session}/auth/qr")
async def get_qr_code(session: str):
    """Obtém QR code de autenticação."""
    session_data = get_session_status(session)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Atualiza status para SCAN_QR_CODE se necessário
    if session_data.get("status") == "STOPPED":
        session_data["status"] = "SCAN_QR_CODE"
    
    qr_image = generate_qr_code()
    return Response(content=qr_image, media_type="image/png")


# User info endpoints
@app.get("/api/{session}/me")
async def get_me(session: str):
    """Obtém informações do usuário autenticado."""
    session_data = get_session_status(session)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return JSONResponse(session_data.get("me", {}))


# Chat endpoints
@app.get("/api/{session}/chats/overview")
async def get_chats_overview(session: str):
    """Obtém overview dos chats."""
    session_data = get_session_status(session)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verifica se a sessão está ativa
    if session_data.get("status") not in ["WORKING", "AUTHENTICATED"]:
        # Retorna lista vazia se sessão não está ativa
        return JSONResponse([])
    
    return JSONResponse(MOCK_CHATS)


@app.get("/api/{session}/chats/{chat_id}/messages")
async def get_chat_messages(
    session: str, 
    chat_id: str, 
    limit: int = Query(40, ge=1, le=100)
):
    """Obtém mensagens de um chat."""
    session_data = get_session_status(session)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Decodifica o chat_id se necessário
    decoded_chat_id = chat_id.replace("%40", "@")
    messages = MOCK_MESSAGES.get(decoded_chat_id, [])
    
    # Ordena mensagens por timestamp (crescente: mais antigas primeiro)
    sorted_messages = sorted(messages, key=lambda m: m.get("timestamp", 0))
    
    # Retorna as últimas 'limit' mensagens (já ordenadas)
    return JSONResponse(sorted_messages[-limit:])


# Message sending endpoints
@app.post("/api/sendText")
async def send_text(data: Dict[str, Any]):
    """Envia uma mensagem de texto."""
    # Simula envio de mensagem - não adiciona à lista de mensagens
    # pois o foco é apenas recuperar mensagens existentes
    chat_id = data.get("chatId", "")
    text = data.get("text", "")
    
    return JSONResponse({
        "id": f"msg_{int(time.time())}",
        "body": text,
        "timestamp": int(time.time()),
        "from": chat_id,
        "fromMe": True,
        "to": chat_id,
        "hasMedia": False,
        "ack": 1
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
