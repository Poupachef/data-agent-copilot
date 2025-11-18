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
    load_dotenv()
except ImportError:
    pass

# URLs e autenticação
WAHA_URL: str = os.getenv("WAHA_URL", "http://localhost:3000")
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
