import json
import logging
from typing import Dict, Any, List, AsyncGenerator
from openai import AzureOpenAI

from app.query.graphrag_query import GraphRagQuery
from app.integration.graphrag_config import GraphRagConfig
from .comparison_models import ComparisonRequest, Requirement, ComparisonResult, SourceResult, CitationInfo
from .response_processor import ResponseProcessor
from .comparison_index_validator import validate_index_access

logger = logging.getLogger(__name__)

class ComparisonExecutor:
    def __init__(self, config: Dict[str, Any], client: AzureOpenAI, response_processor: ResponseProcessor):
        self.config = config
        self.client = client
        self.response_processor = response_processor

    async def execute(self, data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
        try:
            request = ComparisonRequest(**data)
            if not request.requirements:
                raise ValueError("No requirements provided for execution")

            for requirement in request.requirements:
                yield await self._process_requirement(requirement, request, user_id)

        except Exception as e:
            logger.error(f"Error executing comparison: {str(e)}")
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    async def _process_requirement(self, requirement: Dict[str, Any], request: ComparisonRequest, user_id: str) -> str:
        req_obj = Requirement(**requirement)
        result = ComparisonResult(
            requirement=req_obj,
            sources={}
        )

        for index_name in request.indexes:
            try:
                source_result = await self._process_index(index_name, req_obj, user_id)
                result.sources[index_name] = source_result

            except Exception as e:
                logger.error(f"Error querying {index_name} for requirement '{req_obj.description}': {str(e)}")
                result.sources[index_name] = SourceResult(
                    response=f"Error: {str(e)}",
                    simplified_value=None,
                    citations=[]
                )

        return json.dumps({
            "type": "comparison_result",
            "content": result.dict()
        }) + "\n"

    async def _process_index(self, index_name: str, requirement: Requirement, user_id: str) -> SourceResult:
        container_name, data_source = await validate_index_access(user_id, index_name, self.config)
        
        config = GraphRagConfig(index_name, user_id, False)
        graph_rag = GraphRagQuery(config)
        
        query = (
            f"Regarding this requirement: {requirement.description}\n"
            f"What is the current status or value? Provide a clear, specific answer."
        )
        
        response, context = await graph_rag.global_query(query)
        
        reviewed_response, citations = await self.response_processor.process_citations(
            response, 
            context, 
            index_name, 
            data_source
        )

        simplified_value = await self.response_processor.simplify_response(
            requirement.metric_type, 
            response
        )

        citation_infos = [
            CitationInfo(
                text=citation.get('text', ''),
                document_id=citation['file'],
                content=citation.get('content', ''),
                index_name=index_name
            )
            for citation in citations
        ]

        return SourceResult(
            response=response,
            simplified_value=simplified_value,
            citations=citation_infos
        )