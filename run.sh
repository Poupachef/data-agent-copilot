#!/bin/bash

# Script para iniciar o backend e o serviço Docker (Waha ou Mockup)
# Uso: ./run.sh [mock]
#   - ./run.sh mock  -> Inicia o mockup do Waha
#   - ./run.sh       -> Inicia o Waha real
# Imprime todos os endereços relevantes

# Não encerra em erros (usamos verificações manuais)
set +e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verifica se deve usar mockup
USE_MOCKUP=false
if [ "$1" = "mock" ]; then
    USE_MOCKUP=true
fi

# Diretórios
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR/service"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Define diretório do docker-compose baseado no modo
if [ "$USE_MOCKUP" = true ]; then
    DOCKER_COMPOSE_DIR="$SERVICE_DIR/mockup"
    SERVICE_NAME="Mockup do Waha"
else
    DOCKER_COMPOSE_DIR="$SERVICE_DIR/waha"
    SERVICE_NAME="Waha"
fi

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
    cd "$DOCKER_COMPOSE_DIR"
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
if [ "$USE_MOCKUP" = true ]; then
    echo -e "${BLUE}  Modo: Mockup${NC}"
else
    echo -e "${BLUE}  Modo: Waha Real${NC}"
fi
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

# Inicia Docker Compose
echo -e "${GREEN}[1/2]${NC} Iniciando serviço $SERVICE_NAME (Docker)..."
cd "$DOCKER_COMPOSE_DIR"

# Para containers existentes se houver
$DOCKER_COMPOSE_CMD down > /dev/null 2>&1 || true

# Inicia em background
if [ "$USE_MOCKUP" = true ]; then
    $DOCKER_COMPOSE_CMD up -d --build
else
    $DOCKER_COMPOSE_CMD up -d
fi

# Aguarda o serviço estar pronto
echo -e "${YELLOW}Aguardando $SERVICE_NAME iniciar...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$WAHA_PORT/ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $SERVICE_NAME está rodando${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  $SERVICE_NAME pode não estar totalmente pronto, mas continuando...${NC}"
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

if [ "$USE_MOCKUP" = true ]; then
    echo -e "  ${YELLOW}Waha Mockup API (Docker):${NC}"
else
    echo -e "  ${YELLOW}Waha API (Docker):${NC}"
fi
echo -e "    → http://localhost:$WAHA_PORT/api"
echo -e "    → http://localhost:$WAHA_PORT/ping (Health Check)"
if [ "$USE_MOCKUP" = false ]; then
    echo -e "    → http://localhost:$WAHA_PORT/docs (Swagger)"
fi
echo ""

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

