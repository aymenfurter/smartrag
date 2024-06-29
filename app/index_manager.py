from dataclasses import dataclass
from typing import Optional
from .blob_service import sanitize_container_name

class ContainerNameTooLongError(Exception):
    """Raised when the container name exceeds the maximum allowed length."""

@dataclass
class IndexConfig:
    """Configuration for an index."""
    user_id: str
    index_name: str
    is_restricted: bool

class IndexManager:
    """Manages the creation and access of index containers."""

    MAX_CONTAINER_NAME_LENGTH = 63
    INGESTION_SUFFIX = "-ingestion"
    REFERENCE_SUFFIX = "-reference"

    def __init__(self, config: IndexConfig):
        self.config = config
        self.base_container_name = self._create_base_container_name()

    def _create_base_container_name(self) -> str:
        """
        Creates the base container name.
        
        Raises:
            ContainerNameTooLongError: If the resulting container name is too long.
        """
        prefix = f"{self.config.user_id}-" if self.config.is_restricted else "open-"
        full_name = f"{prefix}{self.config.index_name}"
        sanitized_name = sanitize_container_name(full_name)
        
        if len(sanitized_name) > self.MAX_CONTAINER_NAME_LENGTH - len(self.INGESTION_SUFFIX):
            raise ContainerNameTooLongError(
                f"The combined length of user_id and index_name is too long. "
                f"It must be at most {self.MAX_CONTAINER_NAME_LENGTH - len(self.INGESTION_SUFFIX)} "
                "characters after sanitization."
            )
        
        return sanitized_name

    def get_ingestion_container(self) -> str:
        """Returns the name of the ingestion container."""
        return f"{self.base_container_name}{self.INGESTION_SUFFIX}"

    def get_reference_container(self) -> str:
        """Returns the name of the reference container."""
        return f"{self.base_container_name}{self.REFERENCE_SUFFIX}"

    def get_search_index_name(self) -> str:
        """Returns the name of the search index."""
        return self.get_ingestion_container()

    def user_has_access(self) -> bool:
        """Checks if the user has access to the index."""
        if not self.config.is_restricted:
            return True
        return self.base_container_name.startswith(f"{self.config.user_id}-")

def create_index_manager(user_id: str, index_name: str, is_restricted: bool) -> IndexManager:
    """Factory function to create an IndexManager instance."""
    config = IndexConfig(user_id, index_name, is_restricted)
    return IndexManager(config)