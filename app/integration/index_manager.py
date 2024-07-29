from dataclasses import dataclass
from typing import Optional, List, Tuple
import re

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
    LZ_SUFFIX = "-lz" 
    GRDATA_SUFFIX = "-grdata"
    GRREP_SUFFIX = "-grrep"
    GRCACHE_SUFFIX = "-grcache"

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
        sanitized_name = self.sanitize_container_name(full_name)
        
        max_length = self.MAX_CONTAINER_NAME_LENGTH - max(
            len(self.INGESTION_SUFFIX),
            len(self.REFERENCE_SUFFIX),
            len(self.LZ_SUFFIX),
            len(self.GRDATA_SUFFIX),
            len(self.GRREP_SUFFIX),
            len(self.GRCACHE_SUFFIX)
        )
        if len(sanitized_name) > max_length:
            raise ContainerNameTooLongError(
                f"The combined length of user_id and index_name is too long. "
                f"It must be at most {max_length} characters after sanitization."
            )
        
        return sanitized_name

    def get_ingestion_container(self) -> str:
        """Returns the name of the ingestion container."""
        return f"{self.base_container_name}{self.INGESTION_SUFFIX}"

    def get_reference_container(self) -> str:
        """Returns the name of the reference container."""
        return f"{self.base_container_name}{self.REFERENCE_SUFFIX}"

    def get_lz_container(self) -> str:
        """Returns the name of the landing zone container."""
        return f"{self.base_container_name}{self.LZ_SUFFIX}"

    def get_grdata_container(self) -> str:
        """Returns the name of the GraphRAG data container."""
        return f"{self.base_container_name}{self.GRDATA_SUFFIX}"

    def get_grrep_container(self) -> str:
        """Returns the name of the GraphRAG reporting container."""
        return f"{self.base_container_name}{self.GRREP_SUFFIX}"

    def get_grcache_container(self) -> str:
        """Returns the name of the GraphRAG cache container."""
        return f"{self.base_container_name}{self.GRCACHE_SUFFIX}"

    def get_search_index_name(self) -> str:
        """Returns the name of the search index."""
        return self.get_ingestion_container()

    def user_has_access(self) -> bool:
        """Checks if the user has access to the index."""
        if not self.config.is_restricted:
            return True
        return self.base_container_name.startswith(f"{self.config.user_id}-")

    @staticmethod
    def sanitize_container_name(name: str) -> str:
        """
        Sanitize the container name to meet Azure requirements.
        
        - Convert to lowercase
        - Replace invalid characters with hyphens
        - Remove leading and trailing hyphens
        - Collapse multiple consecutive hyphens into a single hyphen
        - Truncate to 63 characters
        """
        sanitized = re.sub(r'[^a-z0-9-]', '-', name.lower())
        sanitized = sanitized.strip('-')
        sanitized = re.sub(r'-+', '-', sanitized)
        
        return sanitized[:63]

    @classmethod
    def create_index_containers(cls, user_id: str, index_name: str, is_restricted: bool) -> List[str]:
        """Create container names for the index and return their names."""
        config = IndexConfig(user_id, index_name, is_restricted)
        manager = cls(config)
        return [
            manager.get_ingestion_container(),
            manager.get_reference_container(),
            manager.get_lz_container(),
            manager.get_grdata_container(),
            manager.get_grrep_container(),
            manager.get_grcache_container()
        ]

    @classmethod
    def parse_container_name(cls, container_name: str) -> Tuple[str, bool]:
        """Parse a container name to extract index name and restricted status."""
        for suffix in [cls.INGESTION_SUFFIX, cls.REFERENCE_SUFFIX, cls.LZ_SUFFIX,
                       cls.GRDATA_SUFFIX, cls.GRREP_SUFFIX, cls.GRCACHE_SUFFIX]:
            if container_name.endswith(suffix):
                base_name = container_name[:-len(suffix)]
                if base_name.startswith("open-"):
                    return base_name[5:], False
                else:
                    user_id, index_name = base_name.rsplit("-", 1)
                    return index_name, True
        return "", False

def create_index_manager(user_id: str, index_name: str, is_restricted: bool) -> IndexManager:
    """Factory function to create an IndexManager instance."""
    config = IndexConfig(user_id, index_name, is_restricted)
    return IndexManager(config)