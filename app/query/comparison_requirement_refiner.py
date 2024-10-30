import json
import logging
from typing import Dict, Any, AsyncGenerator
from openai import AzureOpenAI

from .comparison_models import ComparisonRequest, RequirementList

logger = logging.getLogger(__name__)

class RequirementRefiner:
    def __init__(self, config: Dict[str, Any], client: AzureOpenAI):
        self.config = config
        self.client = client

    async def refine(self, data: Dict[str, Any]) -> AsyncGenerator[str, None]:
        try:
            request = ComparisonRequest(**data)
            if not request.requirements or not request.feedback:
                raise ValueError("Missing requirements or feedback for refinement")

            prompt = self._create_refinement_prompt(request)

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

    def _create_refinement_prompt(self, request: ComparisonRequest) -> str:
        return (
            f"Refine these requirements based on the feedback:\n\n"
            f"Feedback: {request.feedback}\n\n"
            f"Current Requirements:\n"
            f"{json.dumps(request.requirements, indent=2)}\n\n"
            f"Provide updated requirements in the same format."
        )