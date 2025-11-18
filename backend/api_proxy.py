"""
Proxy para requisições à API Waha.
Encaminha requisições HTTP preservando headers e parâmetros.
"""

import logging
from typing import Optional

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse, Response

from config import WAHA_API_KEY, WAHA_URL

logger = logging.getLogger(__name__)


async def proxy_request(request: Request, path: str) -> Response:
    """
    Encaminha requisição para a API Waha.
    
    Args:
        request: Requisição FastAPI original
        path: Caminho da API (sem /api/)
        
    Returns:
        Resposta da API Waha ou erro
    """
    url = f"{WAHA_URL}/api/{path}"
    params = dict(request.query_params)
    
    # Prepara headers a encaminhar
    forward_headers = _prepare_headers(request)
    
    try:
        async with httpx.AsyncClient() as client:
            response = await _make_request(
                client, request.method, url, params, forward_headers, request
            )
            
            # Trata respostas especiais (arquivos, QR codes)
            if path.startswith("files/"):
                return _handle_file_response(response)
            if path.endswith("/qr") and response.status_code == 200:
                return _handle_qr_response(response)
            
            # Resposta padrão
            return Response(
                content=response.content,
                status_code=response.status_code,
                media_type=response.headers.get("content-type", "application/json")
            )
            
    except httpx.RequestError as e:
        logger.error(f"Erro na requisição à API: {repr(e)}")
        return JSONResponse({"error": str(e)}, status_code=502)
    except Exception as e:
        logger.error(f"Erro inesperado: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


def _prepare_headers(request: Request) -> dict:
    """
    Prepara headers para encaminhar à API Waha.
    
    Args:
        request: Requisição original
        
    Returns:
        Dicionário com headers
    """
    headers = {}
    
    content_type = request.headers.get("content-type")
    if content_type:
        headers["Content-Type"] = content_type
    
    if WAHA_API_KEY:
        headers["X-Api-Key"] = WAHA_API_KEY
    
    return headers


async def _make_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    params: dict,
    headers: dict,
    request: Request
) -> httpx.Response:
    """
    Executa requisição HTTP.
    
    Args:
        client: Cliente HTTP assíncrono
        method: Método HTTP
        url: URL completa
        params: Parâmetros de query
        headers: Headers HTTP
        request: Requisição original
        
    Returns:
        Resposta HTTP
    """
    if method == "GET":
        return await client.get(url, params=params, headers=headers)
    
    body = await request.body()
    default_headers = {"Content-Type": "application/json"} if not headers else headers
    return await client.request(
        method, url, params=params, content=body, headers=default_headers
    )


def _handle_file_response(response: httpx.Response) -> Response:
    """
    Trata resposta de arquivo.
    
    Args:
        response: Resposta HTTP
        
    Returns:
        Resposta FastAPI com arquivo ou erro 404
    """
    if response.status_code == 200:
        return Response(
            content=response.content,
            media_type=response.headers.get("content-type", "application/octet-stream")
        )
    return JSONResponse({"error": "File not found"}, status_code=404)


def _handle_qr_response(response: httpx.Response) -> Response:
    """
    Trata resposta de QR code (imagem PNG).
    
    Args:
        response: Resposta HTTP
        
    Returns:
        Resposta FastAPI com imagem PNG
    """
    return Response(content=response.content, media_type="image/png")

