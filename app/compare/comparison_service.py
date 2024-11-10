import logging
from typing import Dict, Any, AsyncGenerator
from app.compare.comparison_executor import ComparisonExecutor
from app.compare.comparison_requirement_generator import RequirementGenerator
import instructor
from openai import AzureOpenAI

from app.integration.azure_openai import get_openai_config
from .response_processor import ResponseProcessor

logger = logging.getLogger(__name__)

class ComparisonService:
    def __init__(self):
        self.config = get_openai_config()
        self.client = instructor.patch(AzureOpenAI(
            api_key=self.config['AOAI_API_KEY'],
            api_version="2024-02-15-preview",
            azure_endpoint=self.config['OPENAI_ENDPOINT']
        ))
        self.response_processor = ResponseProcessor(self.config, self.client)
        self.generator = RequirementGenerator(self.config, self.client, self.response_processor)
        self.executor = ComparisonExecutor(self.config, self.client, self.response_processor)

    async def generate_requirements(self, data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
        async for event in self.generator.generate(data, user_id):
            yield event

    async def execute_comparison(self, data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
        async for event in self.executor.execute(data, user_id):
            yield event