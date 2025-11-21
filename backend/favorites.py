"""
Gerenciamento de favoritos de conversas.
Armazena favoritos em arquivos JSON por sessão.
"""

import json
import logging
from pathlib import Path
from typing import List, Set

logger = logging.getLogger(__name__)

# Diretório base para dados de usuário
USER_DATA_DIR = Path("data/users")
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_favorites_file_path(session: str) -> Path:
    """
    Retorna o caminho do arquivo de favoritos para uma sessão.
    
    Args:
        session: Nome da sessão
        
    Returns:
        Path do arquivo de favoritos
    """
    # Sanitiza o nome da sessão para usar como nome de arquivo
    safe_session = session.replace("/", "_").replace("\\", "_")
    return USER_DATA_DIR / f"{safe_session}_favorites.json"


def get_favorites(session: str) -> List[str]:
    """
    Obtém lista de favoritos de uma sessão.
    
    Args:
        session: Nome da sessão
        
    Returns:
        Lista de IDs de chats favoritos
    """
    favorites_file = get_favorites_file_path(session)
    
    if not favorites_file.exists():
        logger.debug(f"Arquivo de favoritos não encontrado para sessão {session}, retornando lista vazia")
        return []
    
    try:
        with open(favorites_file, "r", encoding="utf-8") as f:
            favorites = json.load(f)
            if isinstance(favorites, list):
                return favorites
            logger.warning(f"Formato inválido no arquivo de favoritos para {session}, retornando lista vazia")
            return []
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao ler arquivo de favoritos para {session}: {e}")
        return []
    except Exception as e:
        logger.error(f"Erro inesperado ao ler favoritos para {session}: {e}")
        return []


def save_favorites(session: str, favorites: List[str]) -> bool:
    """
    Salva lista de favoritos para uma sessão.
    
    Args:
        session: Nome da sessão
        favorites: Lista de IDs de chats favoritos
        
    Returns:
        True se salvou com sucesso, False caso contrário
    """
    favorites_file = get_favorites_file_path(session)
    
    try:
        # Remove duplicatas mantendo a ordem
        unique_favorites = list(dict.fromkeys(favorites))
        
        with open(favorites_file, "w", encoding="utf-8") as f:
            json.dump(unique_favorites, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Favoritos salvos para sessão {session}: {len(unique_favorites)} favoritos")
        return True
    except Exception as e:
        logger.error(f"Erro ao salvar favoritos para {session}: {e}")
        return False


def add_favorite(session: str, chat_id: str) -> bool:
    """
    Adiciona um chat aos favoritos de uma sessão.
    
    Args:
        session: Nome da sessão
        chat_id: ID do chat a ser adicionado
        
    Returns:
        True se adicionou (ou já estava nos favoritos), False em caso de erro
    """
    favorites = get_favorites(session)
    
    if chat_id not in favorites:
        favorites.append(chat_id)
        return save_favorites(session, favorites)
    
    return True  # Já estava nos favoritos


def remove_favorite(session: str, chat_id: str) -> bool:
    """
    Remove um chat dos favoritos de uma sessão.
    
    Args:
        session: Nome da sessão
        chat_id: ID do chat a ser removido
        
    Returns:
        True se removeu (ou não estava nos favoritos), False em caso de erro
    """
    favorites = get_favorites(session)
    
    if chat_id in favorites:
        favorites.remove(chat_id)
        return save_favorites(session, favorites)
    
    return True  # Não estava nos favoritos


def is_favorite(session: str, chat_id: str) -> bool:
    """
    Verifica se um chat é favorito de uma sessão.
    
    Args:
        session: Nome da sessão
        chat_id: ID do chat
        
    Returns:
        True se é favorito, False caso contrário
    """
    favorites = get_favorites(session)
    return chat_id in favorites

