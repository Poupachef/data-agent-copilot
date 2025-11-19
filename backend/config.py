"""
Configuração centralizada do backend.
Carrega variáveis de ambiente e define constantes.
"""

import os
from pathlib import Path
from typing import Optional

# Carrega variáveis de ambiente do arquivo .env se disponível
try:
    from dotenv import load_dotenv
    from pathlib import Path
    # Carrega .env do diretório do backend
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Arquivo .env carregado: {env_path}")
    else:
        print(f"⚠️ Arquivo .env não encontrado em: {env_path}")
except ImportError:
    # Fallback: carrega .env manualmente se dotenv não estiver disponível
    from pathlib import Path
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        print(f"⚠️ python-dotenv não instalado. Carregando .env manualmente...")
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print(f"✅ Arquivo .env carregado manualmente: {env_path}")
except Exception as e:
    print(f"⚠️ Erro ao carregar .env: {e}")

# URLs e autenticação
WAHA_URL: str = os.getenv("WAHA_URL", "http://localhost:3001")
WAHA_API_KEY: Optional[str] = os.getenv("WAHA_API_KEY")

# Porta e host do servidor
BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8001"))
BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")

# Caminho do frontend
FRONTEND_PATH: Path = Path(__file__).parent.parent / "application" / "static"

# Configuração de logging
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Configuração de desenvolvimento
DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
RELOAD: bool = os.getenv("RELOAD", "true").lower() == "true"
