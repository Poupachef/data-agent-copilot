"""
Configuration file for WhatsApp Web Backend
"""

import os
from pathlib import Path

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv not installed, continue without it
    pass

# Base configuration
WAHA_URL = os.getenv("WAHA_URL", "http://localhost:3000")
WAHA_API_KEY = os.getenv("WAHA_API_KEY")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8001"))
BACKEND_HOST = os.getenv("BACKEND_HOST", "0.0.0.0")

# Frontend path
FRONTEND_PATH = Path(__file__).parent.parent / "application" / "static"

# Webhook configuration
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "your-secret-key")
WEBHOOK_ENABLE_HMAC = os.getenv("WEBHOOK_ENABLE_HMAC", "true").lower() == "true"

# Logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# WebSocket configuration
WEBSOCKET_PING_INTERVAL = int(os.getenv("WEBSOCKET_PING_INTERVAL", "30"))
WEBSOCKET_PING_TIMEOUT = int(os.getenv("WEBSOCKET_PING_TIMEOUT", "10"))

# API configuration
API_TIMEOUT = int(os.getenv("API_TIMEOUT", "30"))
API_MAX_RETRIES = int(os.getenv("API_MAX_RETRIES", "3"))

# Development configuration
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
RELOAD = os.getenv("RELOAD", "true").lower() == "true"

# Webhook events to handle (comma-separated)
WEBHOOK_EVENTS = os.getenv("WEBHOOK_EVENTS", "message,message.any,message.ack,session.status").split(",")

# HMAC algorithms supported
SUPPORTED_HMAC_ALGORITHMS = ["sha512"]

# Event status mappings
MESSAGE_ACK_STATUSES = {
    -1: "ERROR",
    0: "PENDING", 
    1: "SERVER",
    2: "DEVICE",
    3: "READ",
    4: "PLAYED"
}

# Session status mappings
SESSION_STATUSES = {
    "STOPPED": "Parado",
    "STARTING": "Iniciando",
    "SCAN_QR_CODE": "Aguardando QR Code",
    "WORKING": "Funcionando",
    "FAILED": "Falhou"
} 