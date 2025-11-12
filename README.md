# data-agent-copilot

Agente de ajuda para vendedores nas interações com os clientes via WhatsApp.

## Arquitetura

- **Frontend**: Interface WhatsApp Web (`application/static/`)
- **Backend**: API Python FastAPI (`backend/`)  
- **Service**: WhatsApp Waha via Docker (`service/`)

## Setup Rápido

1. **Iniciar Waha Service**:
```bash
cd service
docker-compose up -d
```

2. **Instalar Python deps**:
```bash
cd backend
pip install -r requirements.txt
```

3. **Executar backend**:
```bash
cd backend
python main.py
```

4. **Acessar**: http://localhost:8001

## Uso

1. Digite seu telefone
2. Gere QR Code 
3. Escaneie com WhatsApp
4. Use normalmente!

## Arquivos Principais

- `backend/main.py` - API que serve frontend e conecta Waha
- `application/static/app.js` - Frontend simplificado  
- `service/docker-compose.yml` - Waha containerizado
