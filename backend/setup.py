#!/usr/bin/env python3
"""
Script de setup para configuração de webhooks
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    print("🔍 Verificando dependências...")
    
    try:
        import fastapi
        import uvicorn
        import httpx
        import requests
        print("✅ Dependências básicas OK")
    except ImportError as e:
        print(f"❌ Dependência faltando: {e}")
        print("💡 Execute: pip install -r requirements.txt")
        return False
    
    try:
        import dotenv
        print("✅ python-dotenv OK")
    except ImportError:
        print("⚠️ python-dotenv não instalado (opcional)")
    
    return True

def create_env_file():
    """Cria arquivo .env se não existir"""
    env_file = Path(".env")
    env_example = Path("env.example")
    
    if env_file.exists():
        print("✅ Arquivo .env já existe")
        return True
    
    if env_example.exists():
        print("📝 Criando arquivo .env a partir do exemplo...")
        shutil.copy(env_example, env_file)
        print("✅ Arquivo .env criado")
        print("💡 Edite o arquivo .env com suas configurações")
        return True
    else:
        print("❌ Arquivo env.example não encontrado")
        return False

def generate_secret_key():
    """Gera uma chave secreta para HMAC"""
    import secrets
    return secrets.token_hex(32)

def update_env_secret():
    """Atualiza a chave secreta no arquivo .env"""
    env_file = Path(".env")
    
    if not env_file.exists():
        print("❌ Arquivo .env não encontrado")
        return False
    
    # Ler o arquivo
    with open(env_file, 'r') as f:
        content = f.read()
    
    # Gerar nova chave
    new_secret = generate_secret_key()
    
    # Substituir a chave existente ou adicionar nova
    if "WEBHOOK_SECRET=" in content:
        # Substituir linha existente
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith("WEBHOOK_SECRET="):
                lines[i] = f"WEBHOOK_SECRET={new_secret}"
                break
        content = '\n'.join(lines)
    else:
        # Adicionar nova linha
        content += f"\nWEBHOOK_SECRET={new_secret}\n"
    
    # Escrever de volta
    with open(env_file, 'w') as f:
        f.write(content)
    
    print(f"✅ Nova chave secreta gerada: {new_secret[:16]}...")
    return True

def test_webhook_connection():
    """Testa conexão com o webhook"""
    print("🧪 Testando conexão com webhook...")
    
    try:
        import requests
        response = requests.get("http://localhost:8001/ping", timeout=5)
        if response.status_code == 200:
            print("✅ Backend está rodando")
            return True
        else:
            print(f"⚠️ Backend respondeu com status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Não foi possível conectar ao backend: {e}")
        print("💡 Certifique-se de que o backend está rodando em http://localhost:8001")
        return False

def run_webhook_tests():
    """Executa testes de webhook"""
    print("🧪 Executando testes de webhook...")
    
    try:
        result = subprocess.run([sys.executable, "test_webhook.py"], 
                              capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ Testes de webhook passaram")
            return True
        else:
            print("❌ Testes de webhook falharam")
            print(result.stdout)
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Erro ao executar testes: {e}")
        return False

def show_configuration_help():
    """Mostra ajuda para configuração"""
    print("\n📋 CONFIGURAÇÃO DE WEBHOOKS")
    print("=" * 50)
    print()
    print("1. Configure o arquivo .env com suas preferências")
    print("2. Inicie o backend: python main.py")
    print("3. Configure o Waha para enviar webhooks para http://localhost:8001/webhook")
    print()
    print("📖 Para mais informações, consulte WEBHOOK_SETUP.md")
    print()
    print("🔧 Comandos úteis:")
    print("   python main.py                    # Iniciar backend")
    print("   python test_webhook.py            # Testar webhooks")
    print("   python setup.py --generate-secret # Gerar nova chave secreta")
    print()

def main():
    """Função principal"""
    print("🚀 Setup do Sistema de Webhooks")
    print("=" * 40)
    print()
    
    # Verificar argumentos
    if len(sys.argv) > 1:
        if sys.argv[1] == "--generate-secret":
            if update_env_secret():
                print("✅ Chave secreta atualizada com sucesso!")
            else:
                print("❌ Erro ao atualizar chave secreta")
            return
        elif sys.argv[1] == "--help":
            show_configuration_help()
            return
    
    # Verificar dependências
    if not check_dependencies():
        return
    
    # Criar arquivo .env
    if not create_env_file():
        return
    
    # Testar conexão
    if not test_webhook_connection():
        print("\n💡 Para iniciar o backend:")
        print("   cd backend")
        print("   source venv/bin/activate")
        print("   python main.py")
        print()
        return
    
    # Executar testes
    if run_webhook_tests():
        print("\n🎉 Setup concluído com sucesso!")
    else:
        print("\n⚠️ Setup concluído, mas alguns testes falharam")
    
    show_configuration_help()

if __name__ == "__main__":
    main() 