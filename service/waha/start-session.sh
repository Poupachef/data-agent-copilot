#!/bin/bash

echo "🔄 Aguardando Waha service estar pronto..."

# Aguardar até o Waha estar respondendo
while ! curl -s http://localhost:3001/ping > /dev/null; do
    echo "⏳ Aguardando Waha..."
    sleep 2
done

echo "✅ Waha está pronto!"

# Verificar se a sessão default existe
echo "🔍 Verificando sessão default..."
SESSION_STATUS=$(curl -s http://localhost:3001/api/sessions/default)

if [[ $SESSION_STATUS == *"WORKING"* ]] || [[ $SESSION_STATUS == *"AUTHENTICATED"* ]]; then
    echo "✅ Sessão default já está ativa"
else
    echo "🚀 Iniciando sessão default..."
    
    # Criar sessão se não existir
    curl -X POST http://localhost:3001/api/sessions \
        -H "Content-Type: application/json" \
        -d '{"name": "default"}' 2>/dev/null
    
    # Iniciar a sessão
    curl -X POST http://localhost:3001/api/sessions/default/start \
        -H "Content-Type: application/json" 2>/dev/null
    
    echo "✅ Sessão default iniciada!"
fi

echo "�� Setup completo!" 