#!/bin/bash

# Script para iniciar o backend e o serviço Docker (Waha)
# Imprime todos os endereços relevantes

# Não encerra em erros (usamos verificações manuais)
set +e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR/service"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Portas
WAHA_PORT=3001
BACKEND_PORT=8001

# Variável para comando docker-compose (será definida depois)
DOCKER_COMPOSE_CMD=""

# Função para limpar ao sair
cleanup() {
    echo -e "\n${YELLOW}Encerrando serviços...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    cd "$SERVICE_DIR"
    if [ -n "$DOCKER_COMPOSE_CMD" ]; then
        $DOCKER_COMPOSE_CMD down
    else
        docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    fi
    echo -e "${GREEN}Serviços encerrados.${NC}"
    exit 0
}

# Captura Ctrl+C
trap cleanup SIGINT SIGTERM

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  WhatsApp Web - Iniciando Serviços${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Verifica se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker não está rodando. Iniciando Docker...${NC}"
    echo "Por favor, inicie o Docker Desktop e execute este script novamente."
    exit 1
fi

# Verifica se docker-compose está disponível
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  docker-compose não encontrado. Tentando 'docker compose'...${NC}"
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

# Inicia Docker Compose (Waha)
echo -e "${GREEN}[1/2]${NC} Iniciando serviço Waha (Docker)..."
cd "$SERVICE_DIR"

# Para containers existentes se houver
$DOCKER_COMPOSE_CMD down > /dev/null 2>&1 || true

# Inicia em background
$DOCKER_COMPOSE_CMD up -d

# Aguarda o serviço Waha estar pronto
echo -e "${YELLOW}Aguardando Waha iniciar...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$WAHA_PORT/api/sessions > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Waha está rodando${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Waha pode não estar totalmente pronto, mas continuando...${NC}"
    fi
    sleep 1
done

# Verifica dependências do backend
echo -e "\n${GREEN}[2/2]${NC} Verificando dependências do backend..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo -e "${YELLOW}⚠️  Ambiente virtual não encontrado.${NC}"
    echo "Instale as dependências com: pip install -r requirements.txt"
fi

# Inicia backend em background e captura PID
echo -e "${GREEN}Iniciando backend...${NC}"
cd "$BACKEND_DIR"
python3 main.py &
BACKEND_PID=$!

# Aguarda backend estar pronto
echo -e "${YELLOW}Aguardando backend iniciar...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend está rodando${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend pode não estar totalmente pronto, mas continuando...${NC}"
    fi
    sleep 1
done

# Imprime informações
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  ✅ Serviços Iniciados com Sucesso!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}📍 Endereços Disponíveis:${NC}\n"

echo -e "  ${YELLOW}Frontend (Interface Web):${NC}"
echo -e "    → http://localhost:$BACKEND_PORT"
echo -e "    → http://127.0.0.1:$BACKEND_PORT\n"

echo -e "  ${YELLOW}Backend API:${NC}"
echo -e "    → http://localhost:$BACKEND_PORT/api"
echo -e "    → Health Check: http://localhost:$BACKEND_PORT/ping\n"

echo -e "  ${YELLOW}Waha API (Docker):${NC}"
echo -e "    → http://localhost:$WAHA_PORT/api"
echo -e "    → http://localhost:$WAHA_PORT/docs (Swagger)\n"

echo -e "  ${YELLOW}WebSocket:${NC}"
echo -e "    → ws://localhost:$BACKEND_PORT/ws/{phone}\n"

echo -e "  ${YELLOW}Webhook Endpoint:${NC}"
echo -e "    → http://localhost:$BACKEND_PORT/webhook\n"

echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Pressione Ctrl+C para encerrar os serviços${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Mantém o script rodando e mostra logs do backend
# Se o backend terminar, encerra tudo
wait $BACKEND_PID || cleanup

