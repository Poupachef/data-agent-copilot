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
    # Se for OPTIONS, já foi tratado na rota
    if request.method == "OPTIONS":
        return JSONResponse(content={})
    
    # Valida path
    if not path or not isinstance(path, str):
        logger.warning(f"Path inválido recebido: {path}")
        return JSONResponse({"error": "Invalid path"}, status_code=400)
    
    url = f"{WAHA_URL}/api/{path}"
    params = dict(request.query_params)
    
    logger.debug(f"Proxying {request.method} {path} to {url}")
    
    # Prepara headers a encaminhar
    forward_headers = _prepare_headers(request)
    
    try:
        # Configura timeout para evitar travamentos
        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            logger.debug(f"Fazendo requisição para: {url}")
            response = await _make_request(
                client, request.method, url, params, forward_headers, request
            )
            logger.debug(f"Resposta recebida: {response.status_code}")
            
            # Trata respostas especiais (arquivos, QR codes)
            if path.startswith("files/"):
                return _handle_file_response(response)
            if path.endswith("/qr") and response.status_code == 200:
                return _handle_qr_response(response)
            
            # Resposta padrão
            # Loga erros HTTP para debug
            if response.status_code >= 400:
                logger.warning(f"Erro HTTP {response.status_code} do Waha para {path}")
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                media_type=response.headers.get("content-type", "application/json")
            )
            
    except httpx.ConnectError as e:
        logger.error(f"Erro de conexão com Waha em {WAHA_URL}: {repr(e)}")
        return JSONResponse(
            {"error": f"Não foi possível conectar ao Waha em {WAHA_URL}. Verifique se o serviço está rodando."}, 
            status_code=502
        )
    except httpx.TimeoutException as e:
        logger.error(f"Timeout ao conectar com Waha (path: {path}): {repr(e)}")
        return JSONResponse(
            {"error": "Timeout ao conectar com o Waha. O serviço pode estar sobrecarregado."}, 
            status_code=502
        )
    except httpx.HTTPStatusError as e:
        logger.warning(f"Erro HTTP do Waha: {e.response.status_code} - {path}")
        # Propaga a resposta do Waha
        return Response(
            content=e.response.content,
            status_code=e.response.status_code,
            media_type=e.response.headers.get("content-type", "application/json")
        )
    except httpx.RequestError as e:
        logger.error(f"Erro na requisição à API (path: {path}): {repr(e)}")
        return JSONResponse({"error": str(e)}, status_code=502)
    except Exception as e:
        logger.exception(f"Erro inesperado ao processar requisição (path: {path}): {e}")
        return JSONResponse({"error": "Internal server error"}, status_code=500)


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

