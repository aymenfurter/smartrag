import json
import logging
from typing import Dict, Any, Tuple, AsyncGenerator
from openai import AzureOpenAI

from app.integration.index_manager import create_index_manager, ContainerNameTooLongError
from app.integration.azure_aisearch import create_data_source
from app.query.graphrag_query import GraphRagQuery
from app.integration.graphrag_config import GraphRagConfig
from .comparison_models import ComparisonRequest, RequirementList
from .response_processor import ResponseProcessor
from .comparison_index_validator import validate_index_access

logger = logging.getLogger(__name__)

class RequirementGenerator:
    def __init__(self, config: Dict[str, Any], client: AzureOpenAI, response_processor: ResponseProcessor):
        self.config = config
        self.client = client
        self.response_processor = response_processor

    async def generate(self, data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
        try:
            request = ComparisonRequest(**data)
            all_content = []

            for index_name in request.indexes:
                try:
                    logger.info(f"Index name: {index_name}")
                    container_name, data_source = await validate_index_access(user_id, index_name, self.config)
                    
                    config = GraphRagConfig(index_name, user_id, False)
                    graph_rag = GraphRagQuery(config)
                    
                    query = (
                        f"I am a {request.role} reviewing the {request.comparison_subject} "
                        f"of the {request.comparison_target}. What are the key requirements we should check? "
                        f"Focus only on requirements that can be answered with yes/no or specific numeric values."
                        f"The requirement should be in format of a question."
                        f"The requirement should not be too specific."
                        f"The question should be answerable by another document of the same type. (Example: Do not ask 'What is the capital of France?' but 'What is the capital?')"
                        f"Do not include the answer in the requirement."
                    )
                    
                    response, context = await graph_rag.global_query(query)
                    
                    yield json.dumps({
                        "type": "source_data",
                        "content": {
                            "index": index_name,
                            "response": response
                        }
                    }) + "\n"
                    
                    all_content.append({
                        "index": index_name,
                        "content": response,
                        "context": context,
                        "data_source": data_source
                    })
                except Exception as e:
                    logger.error(f"Error querying {index_name}: {str(e)}")
                    yield json.dumps({"type": "error", "content": str(e)}) + "\n"

            combined_prompt = self._create_combined_prompt(request, all_content)
            
            response = self.client.chat.completions.create(
                model=self.config['AZURE_OPENAI_DEPLOYMENT_ID'],
                messages=[{"role": "user", "content": combined_prompt}],
                response_model=RequirementList,
                max_tokens=2000
            )

            for requirement in response.requirements:
                yield json.dumps({
                    "type": "requirement",
                    "content": requirement.dict()
                }) + "\n"

        except Exception as e:
            logger.error(f"Error generating requirements: {str(e)}")
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    def _create_combined_prompt(self, request: ComparisonRequest, all_content: list) -> str:
        combined_prompt = (
            f"Based on analyzing multiple {request.comparison_target}s, create {request.num_requirements} "
            f"requirements for comparing {request.comparison_subject}.\n\n"
        )
        
        for content in all_content:
            combined_prompt += f"Source {content['index']}:\n{content['content']}\n\n"
        
        combined_prompt += (
            f"Generate exactly {request.num_requirements} requirements in this format:\n"
            f"Requirement: [Description]\nMetric: [Yes/No OR specific numeric value with unit]"
        )
        
        return combined_prompt