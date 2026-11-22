import pytest
from httpx import AsyncClient
from app.eval.verifier import HallucinationVerifier


def test_grounded_response_evaluation():
    context = (
        "<retrieved_context id='c1' source='masterchat_doc.pdf' page='1'>\n"
        "MasterChat is an enterprise-grade AI chat platform featuring multi-model LLM orchestration, "
        "RAG, autonomous debate council, and strict privacy protection. It was developed by Rutwij Sudke.\n"
        "</retrieved_context>"
    )
    grounded_response = (
        "MasterChat is an enterprise AI chat platform developed by Rutwij Sudke. "
        "It features multi-model LLM orchestration, RAG, an autonomous debate council, and strict privacy protection."
    )

    scorecard = HallucinationVerifier.evaluate_response(
        user_query="Who developed MasterChat and what are its features?",
        response_text=grounded_response,
        retrieved_context=context,
        citations=[{"chunk_id": "c1", "filename": "masterchat_doc.pdf", "text": "developed by Rutwij Sudke"}],
    )

    assert scorecard.verdict == "PASS"
    assert scorecard.hallucination_detected is False
    assert scorecard.hallucination_rate == 0.0
    assert scorecard.faithfulness_score == 1.0
    assert scorecard.citation_precision == 1.0
    assert scorecard.overall_accuracy >= 0.90
    assert len(scorecard.unsupported_claims) == 0


def test_unanswerable_query_refusal_evaluation():
    context = (
        "<retrieved_context id='c1' source='quarterly_report.pdf' page='1'>\n"
        "Q3 revenue reached $4.2M with operating margins of 24%.\n"
        "</retrieved_context>"
    )
    # The assistant properly admits the context lacks information instead of hallucinating
    truthful_refusal = (
        "The provided documents do not contain information regarding employee stock grant schedules "
        "or severance packages."
    )

    scorecard = HallucinationVerifier.evaluate_response(
        user_query="What are the employee stock grant schedules?",
        response_text=truthful_refusal,
        retrieved_context=context,
    )

    assert scorecard.verdict == "PASS"
    assert scorecard.hallucination_detected is False
    assert scorecard.hallucination_rate == 0.0
    assert scorecard.faithfulness_score == 1.0
    assert scorecard.details["grounding_status"] == "truthful_admittance"


def test_fabricated_claims_hallucination_detection():
    context = (
        "<retrieved_context id='c1' source='history.txt' page='1'>\n"
        "The Eiffel Tower was constructed in Paris, France between 1887 and 1889 for the 1889 World's Fair.\n"
        "</retrieved_context>"
    )
    hallucinated_response = (
        "The Eiffel Tower is in Paris, France. "
        "It was commissioned by Emperor Napoleon Bonaparte and built out of solid titanium by 8,000 Martian architects."
    )

    scorecard = HallucinationVerifier.evaluate_response(
        user_query="Who built the Eiffel Tower and what is it made of?",
        response_text=hallucinated_response,
        retrieved_context=context,
    )

    assert scorecard.verdict == "FAIL"
    assert scorecard.hallucination_detected is True
    assert scorecard.hallucination_rate > 0.0
    assert len(scorecard.unsupported_claims) > 0
    assert any("titanium" in c.lower() or "napoleon" in c.lower() for c in scorecard.unsupported_claims)


def test_citation_authenticity_verification():
    context = (
        "<retrieved_context id='chunk_42' source='architecture.md' page='3'>\n"
        "PostgreSQL stores conversations and user metadata, while ChromaDB stores embeddings.\n"
        "</retrieved_context>"
    )

    # Valid citation
    valid_res = HallucinationVerifier.verify_citations(
        [{"chunk_id": "chunk_42", "filename": "architecture.md"}],
        context,
    )
    assert valid_res["citation_precision"] == 1.0
    assert valid_res["valid_citations_count"] == 1
    assert valid_res["invalid_citations_count"] == 0

    # Fabricated / hallucinated citation
    invalid_res = HallucinationVerifier.verify_citations(
        [{"chunk_id": "hallucinated_chunk_999", "filename": "fake_doc.pdf"}],
        context,
    )
    assert invalid_res["citation_precision"] == 0.0
    assert invalid_res["valid_citations_count"] == 0
    assert invalid_res["invalid_citations_count"] == 1


def test_benchmark_suite_runner():
    benchmark_report = HallucinationVerifier.run_benchmark_suite()
    assert benchmark_report["status"] == "completed"
    assert benchmark_report["all_passed"] is True
    assert benchmark_report["pass_rate_percentage"] == 100.0
    assert benchmark_report["total_benchmarks"] >= 5


@pytest.mark.asyncio
async def test_eval_verify_api_endpoint(async_client: AsyncClient):
    headers = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}
    payload = {
        "query": "What is ChromaDB used for?",
        "response": "ChromaDB is used as the high-performance vector database to store document embeddings.",
        "context": "<retrieved_context id='c1' source='stack.txt'>ChromaDB is used as the high-performance vector database to store document embeddings.</retrieved_context>",
        "citations": [{"chunk_id": "c1", "filename": "stack.txt"}],
    }

    resp = await async_client.post("/api/v1/eval/verify", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["verdict"] == "PASS"
    assert data["hallucination_detected"] is False
    assert data["faithfulness_score"] == 1.0
    assert data["citation_precision"] == 1.0


@pytest.mark.asyncio
async def test_eval_benchmark_api_endpoint(async_client: AsyncClient):
    headers = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}
    resp = await async_client.get("/api/v1/eval/benchmark", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["all_passed"] is True
    assert data["pass_rate_percentage"] == 100.0
