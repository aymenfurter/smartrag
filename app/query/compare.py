import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator, Tuple
from functools import lru_cache
from pydantic import BaseModel, Field
from app.integration.index_manager import create_index_manager, ContainerNameTooLongError
import instructor
from openai import AzureOpenAI
import json
import re
from flask import Response, jsonify
import logging
import requests

from app.query.graphrag_query import GraphRagQuery
from app.integration.graphrag_config import GraphRagConfig
from app.integration.azure_openai import create_payload, get_openai_config
from app.integration.azure_aisearch import create_data_source

logger = logging.getLogger(__name__)

class Requirement(BaseModel):
    description: str = Field(..., description="The detailed description of what needs to be compared")
    metric_type: str = Field(..., description="Type of metric: 'yes_no' or 'numeric'")
    metric_unit: Optional[str] = Field(None, description="Unit for numeric metrics (e.g., 'hours', '%', 'CHF')")

class RequirementList(BaseModel):
    requirements: List[Requirement] = Field(..., description="List of requirements to compare")

class CitationInfo(BaseModel):
    text: str = Field(..., description="The cited text")
    document_id: str = Field(..., description="Source document identifier")
    content: str = Field(..., description="Full context of the citation")
    index_name: str = Field(..., description="Name of the index this citation is from")

class ComparisonRequest(BaseModel):
    phase: str = Field(..., description="Phase of comparison: 'generate', 'refine', or 'execute'")
    num_requirements: int = Field(default=10, description="Number of requirements to generate")
    role: str = Field(default="auditor", description="Role performing the comparison")
    comparison_subject: str = Field(default="employment conditions", description="Subject being compared")
    comparison_target: str = Field(default="Hospital", description="Target entity type being compared")
    indexes: List[str] = Field(..., min_items=2, max_items=2, description="Exactly 2 indexes to compare")
    is_restricted: bool = Field(default=True, description="Whether the indexes are restricted")
    requirements: Optional[List[Dict[str, Any]]] = Field(None, description="Requirements for refine/execute phase")
    feedback: Optional[str] = Field(None, description="Feedback for refinement phase")

class SimplifiedResponse(BaseModel):
    value: Optional[str] = Field(None, description="Simplified value: 'Yes', 'No', or numeric value with unit")

class SourceResult(BaseModel):
    response: str = Field(..., description="Detailed response from the data source")
    simplified_value: Optional[str] = Field(None, description="Simplified value extracted from the detailed response")
    citations: List[CitationInfo] = Field(default_factory=list, description="List of citations related to the response")

class ComparisonResult(BaseModel):
    requirement: Requirement = Field(..., description="The requirement being compared")
    sources: Dict[str, SourceResult] = Field(..., description="Responses from each data source")

class ComparisonService:
    def __init__(self):
        self.config = get_openai_config()
        self.client = instructor.patch(AzureOpenAI(
            api_key=self.config['AOAI_API_KEY'],
            api_version="2024-02-15-preview",
            azure_endpoint=self.config['OPENAI_ENDPOINT']
        ))
        self.simplify_client = instructor.patch(AzureOpenAI(
            api_key=self.config['AOAI_API_KEY'],
            api_version="2024-02-15-preview",
            azure_endpoint=self.config['OPENAI_ENDPOINT']
        ))

    async def _validate_index_access(self, user_id: str, index_name: str) -> Tuple[str, Dict[str, Any]]:
        """Validate index access and return container name and data source."""
        try:
            index_manager = create_index_manager(user_id, index_name, False)
            
            if not index_manager.user_has_access():
                raise ValueError("Unauthorized access")
                
            container_name = index_manager.get_ingestion_container()
            
            data_source = create_data_source(
                self.config['SEARCH_SERVICE_ENDPOINT'],
                self.config['SEARCH_SERVICE_API_KEY'],
                container_name
            )
            
            return container_name, data_source
            
        except ContainerNameTooLongError as e:
            raise ValueError(f"Container name too long: {str(e)}")
        except Exception as e:
            raise ValueError(f"Error accessing index: {str(e)}")

    async def generate_requirements(self, data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
        """Generate requirements by querying both data sources and combining results."""
        try:
            request = ComparisonRequest(**data)
            all_content = []

            for index_name in request.indexes:
                try:
                    logger.info(f"Index name: {index_name}")
                    
                    # Validate index access
                    container_name, data_source = await self._validate_index_access(user_id, index_name)
                    
                    config = GraphRagConfig(index_name, user_id, False)
                    graph_rag = GraphRagQuery(config)
                    
                    query = (
                        f"I am a {request.role} reviewing the {request.comparison_subject} "
                        f"of the {request.comparison_target}. What are the key requirements we should check? "
                        f"Focus only on requirements that can be answered with yes/no or specific numeric values."
                        f"The requirement should be in format of a question."
                        f"The requirement should not be too specific or too general."
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

    async def _process_citations(self, response: str, context: Dict[str, Any], index_name: str, user_id: str) -> Tuple[str, List[Dict[str, Any]]]:
        """Process response and extract citations using data source."""
        try:
            # Validate index access and get data source
            container_name, data_source = await self._validate_index_access(user_id, index_name)

            url = f"{self.config['OPENAI_ENDPOINT']}/openai/deployments/{self.config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
            headers = {
                "Content-Type": "application/json",
                "api-key": self.config['AOAI_API_KEY']
            }

            prompt = (
                "Please analyze this response and provide citations:\n\n"
                f"{response}\n\n"
                "Verify the information and provide citations from our knowledge base."
            )

            payload = create_payload(
                [{"role": "user", "content": prompt}],
                {},
                {},
                [data_source],
                False
            )

            response_data = requests.post(url, headers=headers, json=payload)
            response_data.raise_for_status()
            
            result = response_data.json()
            verified_response = result["choices"][0]["message"]["content"]
            
            citations = []
            if "context" in result["choices"][0]["message"]:
                context_data = result["choices"][0]["message"]["context"]
                if "citations" in context_data:
                    citations = [
                        {
                            "file": citation["url"].split("/")[-1],
                            "content": citation.get("content", ""),
                            "text": citation.get("text", "")
                        }
                        for citation in context_data["citations"]
                    ]

            return verified_response, citations

        except Exception as e:
            logger.error(f"Error processing citations: {str(e)}")
            return response, []

    async def execute_comparison(self, data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
        """Execute comparison using final requirements."""
        try:
            request = ComparisonRequest(**data)
            if not request.requirements:
                raise ValueError("No requirements provided for execution")

            for requirement in request.requirements:
                req_obj = Requirement(**requirement)
                result = ComparisonResult(
                    requirement=req_obj,
                    sources={}
                )

                for index_name in request.indexes:
                    try:
                        # Validate index access
                        container_name, data_source = await self._validate_index_access(user_id, index_name)
                        
                        config = GraphRagConfig(index_name, user_id, False)
                        graph_rag = GraphRagQuery(config)
                        
                        query = (
                            f"Regarding this requirement: {req_obj.description}\n"
                            f"What is the current status or value? Provide a clear, specific answer."
                        )
                        
                        response, context = await graph_rag.global_query(query)
                        
                        reviewed_response, citations = await self._process_citations(response, context, index_name, user_id)
                        simplified_value = await self._simplify_response(req_obj.metric_type, reviewed_response)

                        mentioned_citations = re.findall(r'\[doc(\d+)\]', reviewed_response)
                        mentioned_indices = {int(index) - 1 for index in mentioned_citations} 

                        citation_infos = [
                            CitationInfo(
                                text=citation.get('text', ''),
                                document_id=citation['file'],
                                content=citation.get('content', ''),
                                index_name=index_name
                            )
                            for i, citation in enumerate(citations) if i in mentioned_indices
                        ]

                        result.sources[index_name] = SourceResult(
                            response=response,
                            simplified_value=simplified_value,
                            citations=citation_infos
                        )

                    except Exception as e:
                        logger.error(f"Error querying {index_name} for requirement '{req_obj.description}': {str(e)}")
                        result.sources[index_name] = SourceResult(
                            response=f"Error: {str(e)}",
                            simplified_value=None,
                            citations=[]
                        )

                yield json.dumps({
                    "type": "comparison_result",
                    "content": result.dict()
                }) + "\n"

        except Exception as e:
            logger.error(f"Error executing comparison: {str(e)}")
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    async def refine_requirements(self, data: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """Refine existing requirements based on feedback."""
        try:
            request = ComparisonRequest(**data)
            if not request.requirements or not request.feedback:
                raise ValueError("Missing requirements or feedback for refinement")

            prompt = (
                f"Refine these requirements based on the feedback:\n\n"
                f"Feedback: {request.feedback}\n\n"
                f"Current Requirements:\n"
                f"{json.dumps(request.requirements, indent=2)}\n\n"
                f"Provide updated requirements in the same format."
            )

            response = await self.client.chat.completions.create(
                model=self.config['AZURE_OPENAI_DEPLOYMENT_ID'],
                messages=[{"role": "user", "content": prompt}],
                response_model=RequirementList
            )

            yield json.dumps({
                "type": "refined_requirements",
                "content": [req.dict() for req in response.requirements]
            }) + "\n"

        except Exception as e:
            logger.error(f"Error refining requirements: {str(e)}")
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    async def _simplify_response(self, metric_type: str, detailed_response: str) -> Optional[str]:
        """Simplify the detailed response into a Yes/No or numeric value."""
        try:
            if metric_type == "yes_no":
                if "I am sorry" in detailed_response:
                    return "N/A"
                if "The requested information is not available" in detailed_response:
                    return "N/A"
                prompt = f"Extract a single answer (Yes or No) from the following text:\n\n{detailed_response}"
                response = self.simplify_client.chat.completions.create(
                    model=self.config['AZURE_OPENAI_DEPLOYMENT_ID'],
                    response_model=SimplifiedResponse,
                    messages=[{"role": "user", "content": prompt}]
                )
                simplified = response.value.strip()
                if "yes" in simplified.lower():
                    return "Yes"
                elif "no" in simplified.lower():
                    return "No"
                else:
                    return "N/A"

            elif metric_type == "numeric":
                prompt = f"Extract a single numeric value and its unit from the following response:\n\n{detailed_response}"
                response = self.simplify_client.chat.completions.create(
                    model=self.config['AZURE_OPENAI_DEPLOYMENT_ID'],
                    response_model=SimplifiedResponse,
                    messages=[{"role": "user", "content": prompt}]
                )
                simplified = response.value.strip()
                return simplified
            else:
                return None
        except Exception as e:
            logger.error(f"Error simplifying response: {str(e)}")
            return None

def convert_async_to_sync(async_gen):
    """Convert async generator to sync generator for Flask response."""
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        while True:
            try:
                yield loop.run_until_complete(async_gen.__anext__())
            except StopAsyncIteration:
                break
    finally:
            loop.close()

async def handle_comparison_request(data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
    """Handle different phases of comparison process."""
    service = ComparisonService()
    phase = data.get("phase")

    if phase == "generate":
        async for event in service.generate_requirements(data, user_id):
            yield event
    elif phase == "refine":
        async for event in service.refine_requirements(data):
            yield event
    elif phase == "execute":
        async for event in service.execute_comparison(data, user_id):
            yield event
    else:
        yield json.dumps({"type": "error", "content": "Invalid phase specified"}) + "\n"

async def compare_indexes(data: Dict[str, Any], user_id: str) -> Response:
    """Entry point for comparison functionality."""
    try:
        return Response(
            convert_async_to_sync(handle_comparison_request(data, user_id)),
            content_type='application/x-ndjson'
        )
    except Exception as e:
        logger.error(f"Error in compare_indexes: {str(e)}")
        return jsonify({"error": str(e)}), 500        