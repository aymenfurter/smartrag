import logging
from typing import Dict, Any, Tuple

from app.integration.index_manager import create_index_manager, ContainerNameTooLongError
from app.integration.azure_aisearch import create_data_source

logger = logging.getLogger(__name__)

async def validate_index_access(user_id: str, index_name: str, config: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Validate index access and return container name and data source."""
    try:
        index_manager = create_index_manager(user_id, index_name, False)
        
        if not index_manager.user_has_access():
            raise ValueError("Unauthorized access")
            
        container_name = index_manager.get_ingestion_container()
        
        data_source = create_data_source(
            config['SEARCH_SERVICE_ENDPOINT'],
            config['SEARCH_SERVICE_API_KEY'],
            container_name
        )
        
        return container_name, data_source
        
    except ContainerNameTooLongError as e:
        raise ValueError(f"Container name too long: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error accessing index: {str(e)}")