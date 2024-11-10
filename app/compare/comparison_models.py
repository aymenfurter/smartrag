from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

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