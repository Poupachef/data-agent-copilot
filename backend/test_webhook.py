#!/usr/bin/env python3
"""
Script de teste para webhooks.
Testa diferentes tipos de eventos do Waha API.
"""

import json
import time
from typing import Any, Callable, Dict, List, Tuple

import hmac
import hashlib
import requests

# Configuração
WEBHOOK_URL: str = "http://localhost:8001/webhook"
WEBHOOK_SECRET: str = "your-secret-key"  # Deve ser igual ao configurado no backend


def create_hmac_signature(body: str, secret: str) -> str:
    """
    Cria assinatura HMAC SHA-512.
    
    Args:
        body: Corpo da requisição
        secret: Chave secreta
        
    Returns:
        Assinatura HMAC em hexadecimal
    """
    return hmac.new(
        secret.encode('utf-8'),
        body.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()


def send_webhook_event(event_data: Dict[str, Any], include_hmac: bool = True) -> bool:
    """
    Envia evento de webhook para o backend.
    
    Args:
        event_data: Dados do evento
        include_hmac: Se deve incluir assinatura HMAC
        
    Returns:
        True se sucesso, False caso contrário
    """
    try:
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Request-Id": f"test_{int(time.time() * 1000)}",
            "X-Webhook-Timestamp": str(int(time.time() * 1000))
        }
        
        if include_hmac:
            body = json.dumps(event_data)
            hmac_signature = create_hmac_signature(body, WEBHOOK_SECRET)
            headers["X-Webhook-Hmac"] = hmac_signature
            headers["X-Webhook-Hmac-Algorithm"] = "sha512"
        
        response = requests.post(WEBHOOK_URL, json=event_data, headers=headers)
        
        print(f"📤 Evento: {event_data.get('event', 'unknown')}")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")
        print()
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ Erro ao enviar evento: {e}")
        return False


def create_test_event(event_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Cria estrutura básica de evento de teste.
    
    Args:
        event_type: Tipo do evento
        payload: Payload do evento
        
    Returns:
        Estrutura completa do evento
    """
    return {
        "id": f"evt_test_{event_type}_{int(time.time())}",
        "timestamp": int(time.time() * 1000),
        "event": event_type,
        "session": "default",
        "payload": payload,
        "engine": "WEBJS"
    }


def test_message_event() -> bool:
    """Testa evento de mensagem."""
    event_data = create_test_event("message", {
        "id": "true_1234567890@c.us_ABCDEF123456",
        "timestamp": int(time.time()),
        "from": "9876543210@c.us",
        "fromMe": False,
        "source": "app",
        "to": "1234567890@c.us",
        "body": "Olá! Esta é uma mensagem de teste.",
        "hasMedia": False,
        "ack": 1,
        "vCards": [],
        "_data": {}
    })
    event_data["me"] = {
        "id": "1234567890@c.us",
        "pushName": "Test User"
    }
    event_data["environment"] = {
        "tier": "PLUS",
        "version": "2023.10.12"
    }
    
    print("🧪 Testando evento de mensagem...")
    return send_webhook_event(event_data)


def test_message_ack_event() -> bool:
    """Testa evento de confirmação de mensagem."""
    event_data = create_test_event("message.ack", {
        "id": "true_1234567890@c.us_ABCDEF123456",
        "from": "9876543210@c.us",
        "participant": None,
        "fromMe": False,
        "ack": 3,
        "ackName": "READ"
    })
    
    print("🧪 Testando evento de confirmação de mensagem...")
    return send_webhook_event(event_data)


def test_session_status_event() -> bool:
    """Testa evento de status da sessão."""
    event_data = create_test_event("session.status", {
        "status": "WORKING"
    })
    event_data["me"] = {
        "id": "1234567890@c.us",
        "pushName": "Test User"
    }
    event_data["environment"] = {
        "version": "2023.10.12",
        "engine": "WEBJS",
        "tier": "PLUS"
    }
    
    print("🧪 Testando evento de status da sessão...")
    return send_webhook_event(event_data)


def test_without_hmac() -> bool:
    """Testa envio sem HMAC."""
    event_data = create_test_event("message", {
        "id": "true_1234567890@c.us_NO_HMAC_TEST",
        "from": "9876543210@c.us",
        "body": "Teste sem HMAC",
        "hasMedia": False
    })
    
    print("🧪 Testando envio sem HMAC...")
    return send_webhook_event(event_data, include_hmac=False)


def main() -> None:
    """Executa todos os testes."""
    print("🚀 Iniciando testes de webhook...")
    print(f"📡 URL: {WEBHOOK_URL}")
    print(f"🔑 Secret: {WEBHOOK_SECRET}")
    print()
    
    tests: List[Tuple[str, Callable[[], bool]]] = [
        ("Mensagem", test_message_event),
        ("Confirmação de Mensagem", test_message_ack_event),
        ("Status da Sessão", test_session_status_event),
        ("Sem HMAC", test_without_hmac)
    ]
    
    results: List[Tuple[str, bool]] = []
    
    for test_name, test_func in tests:
        print(f"🔍 {test_name}")
        print("-" * 50)
        
        try:
            success = test_func()
            results.append((test_name, success))
            
            if success:
                print(f"✅ {test_name}: SUCESSO")
            else:
                print(f"❌ {test_name}: FALHA")
                
        except Exception as e:
            print(f"💥 {test_name}: ERRO - {e}")
            results.append((test_name, False))
        
        print()
        time.sleep(1)  # Pausa entre testes
    
    # Resumo
    print("📊 RESUMO DOS TESTES")
    print("=" * 50)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSOU" if success else "❌ FALHOU"
        print(f"{status}: {test_name}")
    
    print()
    print(f"📈 Resultado: {passed}/{total} testes passaram")
    
    if passed == total:
        print("🎉 Todos os testes passaram!")
    else:
        print("⚠️ Alguns testes falharam. Verifique os logs do backend.")


if __name__ == "__main__":
    main()
