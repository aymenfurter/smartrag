import json
import logging
from typing import Dict, Any, AsyncGenerator
from flask import Response, jsonify
from .comparison_service import ComparisonService
from .utils import convert_async_to_sync
from .comparison_models import ComparisonRequest

logger = logging.getLogger(__name__)

async def handle_comparison_request(data: Dict[str, Any], user_id: str) -> AsyncGenerator[str, None]:
    """Handle different phases of comparison process."""
    try:
        service = ComparisonService()
        request = ComparisonRequest(**data)

        if request.phase == "generate":
            async for event in service.generate_requirements(data, user_id):
                yield event
        elif request.phase == "execute":
            async for event in service.execute_comparison(data, user_id):
                yield event
        else:
            yield json.dumps({
                "type": "error", 
                "content": f"Invalid phase specified: {request.phase}"
            }) + "\n"

    except Exception as e:
        logger.error(f"Error in handle_comparison_request: {str(e)}")
        yield json.dumps({
            "type": "error",
            "content": f"Request processing error: {str(e)}"
        }) + "\n"

async def compare_indexes(data: Dict[str, Any], user_id: str) -> Response:
    """Entry point for comparison functionality."""
    try:
        return Response(
            convert_async_to_sync(handle_comparison_request(data, user_id)),
            content_type='application/x-ndjson'
        )
    except Exception as e:
        logger.error(f"Error in compare_indexes: {str(e)}")
        return jsonify({
            "error": "Comparison failed",
            "details": "An internal error has occurred. Please try again later."
        }), 500