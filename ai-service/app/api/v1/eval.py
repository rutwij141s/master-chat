import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import get_current_user_id
from app.eval.verifier import HallucinationVerifier

logger = logging.getLogger(__name__)
router_api = APIRouter()


class VerifyRequest(BaseModel):
    query: str = Field(..., description="The user question or prompt")
    response: str = Field(..., description="The assistant response to verify")
    context: str = Field(default="", description="The retrieved context against which to ground the response")
    citations: Optional[List[Dict[str, Any]]] = Field(default=None, description="List of citation objects emitted with response")


class VerifyResponse(BaseModel):
    faithfulness_score: float
    hallucination_detected: bool
    hallucination_rate: float
    citation_precision: float
    relevance_score: float
    overall_accuracy: float
    supported_claims_count: int
    unsupported_claims_count: int
    supported_claims: List[str]
    unsupported_claims: List[str]
    verdict: str
    details: Dict[str, Any]


@router_api.post("/verify", response_model=VerifyResponse)
async def verify_hallucination(
    req: VerifyRequest,
    user_id=Depends(get_current_user_id),
):
    """
    Evaluates an LLM response against retrieved context for factual faithfulness,
    hallucination rate, citation precision, and query relevance.
    """
    scorecard = HallucinationVerifier.evaluate_response(
        user_query=req.query,
        response_text=req.response,
        retrieved_context=req.context,
        citations=req.citations,
    )
    return scorecard.to_dict()


@router_api.get("/benchmark")
async def run_evaluation_benchmark(
    user_id=Depends(get_current_user_id),
):
    """
    Runs the automated comprehensive accuracy and hallucination benchmark suite.
    Evaluates grounded queries, refusal of unanswerable queries, citation validity, and math precision.
    """
    try:
        report = HallucinationVerifier.run_benchmark_suite()
        return report
    except Exception as e:
        logger.exception("Benchmark execution failed")
        raise HTTPException(status_code=500, detail=str(e))
