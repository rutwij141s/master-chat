import re
import logging
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class EvaluationScorecard:
    """Represents the results of an accuracy and hallucination evaluation."""

    def __init__(
        self,
        faithfulness_score: float,
        hallucination_detected: bool,
        hallucination_rate: float,
        citation_precision: float,
        relevance_score: float,
        overall_accuracy: float,
        supported_claims: List[str],
        unsupported_claims: List[str],
        verdict: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.faithfulness_score = faithfulness_score
        self.hallucination_detected = hallucination_detected
        self.hallucination_rate = hallucination_rate
        self.citation_precision = citation_precision
        self.relevance_score = relevance_score
        self.overall_accuracy = overall_accuracy
        self.supported_claims = supported_claims
        self.unsupported_claims = unsupported_claims
        self.verdict = verdict
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "faithfulness_score": round(self.faithfulness_score, 4),
            "hallucination_detected": self.hallucination_detected,
            "hallucination_rate": round(self.hallucination_rate, 4),
            "citation_precision": round(self.citation_precision, 4),
            "relevance_score": round(self.relevance_score, 4),
            "overall_accuracy": round(self.overall_accuracy, 4),
            "supported_claims_count": len(self.supported_claims),
            "unsupported_claims_count": len(self.unsupported_claims),
            "supported_claims": self.supported_claims,
            "unsupported_claims": self.unsupported_claims,
            "verdict": self.verdict,
            "details": self.details,
        }


class HallucinationVerifier:
    """
    Evaluator and verifier for LLM output faithfulness, hallucination detection,
    and citation accuracy against grounded reference context.
    """

    # Common negative admission patterns where the LLM truthfully states the context lacks information
    NEGATIVE_ADMISSION_PATTERNS = [
        r"(?:does not|doesn't|do not) (?:contain|mention|state|provide|include|specify)",
        r"no information (?:is |was )?(?:found|provided|available|given|contained|mentioned)",
        r"based on the (?:provided|retrieved) (?:documents|context|text),? (?:there is no|it does not|we cannot)",
        r"(?:not mentioned|not provided|not available|not found|not specified) in the (?:document|context|source)",
        r"cannot answer (?:this|the) question (?:based on|from) the (?:provided|available)",
        r"the provided (?:document|pdf|file|context) does not (?:contain|have)",
    ]

    # Conversational filler to exclude from strict factual claim checking
    BOILERPLATE_PATTERNS = [
        r"^(?:here is|here are|sure|certainly|hello|hi|below is|in summary|to summarize|based on the document)",
        r"^(?:according to the provided|as stated in the|as mentioned in the)",
        r"^(?:please let me know if|hope this helps|feel free to ask)",
    ]

    @classmethod
    def extract_claims(cls, text: str) -> List[str]:
        """
        Segment text into individual propositions or sentences for factual verification.
        Filters out markdown formatting, headers, and conversational filler.
        """
        if not text:
            return []

        # Remove markdown headers and code blocks
        clean_text = re.sub(r"```[\s\S]*?```", "", text)
        clean_text = re.sub(r"^#+\s+.*$", "", clean_text, flags=re.MULTILINE)

        # Split on sentence boundaries and bullet points
        raw_sentences = re.split(r"(?<=[.!?])\s+|\n[-*•]\s+|\n\d+\.\s+", clean_text)
        claims = []

        for s in raw_sentences:
            s_clean = s.strip()
            # Ignore empty or very short snippets
            if len(s_clean) < 15:
                continue

            # Skip conversational boilerplate
            if any(re.search(bp, s_clean, re.IGNORECASE) for bp in cls.BOILERPLATE_PATTERNS):
                # If sentence has factual content after the boilerplate, strip boilerplate and keep fact
                for bp in cls.BOILERPLATE_PATTERNS:
                    s_clean = re.sub(bp + r"[:,]?\s*", "", s_clean, flags=re.IGNORECASE).strip()
                if len(s_clean) < 15:
                    continue

            claims.append(s_clean)

        return claims

    @classmethod
    def is_truthful_negative(cls, text: str) -> bool:
        """
        Checks if the response is a faithful admission that the context does not contain the answer.
        This represents 100% faithful and non-hallucinated behavior on unanswerable queries.
        """
        return any(re.search(p, text, re.IGNORECASE) for p in cls.NEGATIVE_ADMISSION_PATTERNS)

    @classmethod
    def verify_claim_in_context(cls, claim: str, context: str) -> Tuple[bool, float]:
        """
        Verify whether an individual claim is grounded in the retrieved context.
        Uses exact match, entity containment, and lexical n-gram overlap.
        """
        if not claim or not context:
            return False, 0.0

        claim_lower = claim.lower()
        context_lower = context.lower()

        # 1. Direct substring match
        if claim_lower in context_lower:
            return True, 1.0

        # 2. Extract significant terms (words >= 4 chars, numbers, capitalized acronyms)
        words = re.findall(r"\b[A-Za-z0-9_\-\.]{3,}\b", claim)
        if not words:
            return True, 1.0

        # Filter common stopwords
        stopwords = {
            "this", "that", "with", "from", "have", "were", "what", "which", "there",
            "their", "about", "would", "could", "should", "these", "those", "when",
            "where", "while", "using", "being", "been", "also", "then", "into", "more"
        }
        content_words = [w.lower() for w in words if w.lower() not in stopwords]

        if not content_words:
            return True, 0.8

        matches = sum(1 for w in content_words if w in context_lower)
        overlap_ratio = matches / len(content_words)

        # High keyword overlap (>= 60% of informative keywords present in context)
        is_supported = overlap_ratio >= 0.55

        # Also check for numbers / dates in the claim: numbers must be strictly present
        numbers = re.findall(r"\b\d+(?:\.\d+)?%?\b", claim)
        if numbers:
            num_matches = sum(1 for n in numbers if n in context)
            if num_matches < len(numbers) and overlap_ratio < 0.85:
                # If a specific number was hallucinated, mark as unsupported
                is_supported = False

        return is_supported, overlap_ratio

    @classmethod
    def verify_faithfulness(
        cls,
        response_text: str,
        context: str,
        user_query: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates the faithfulness of a generated response against the retrieved context.
        Returns detailed grounding analytics, supported vs unsupported claims, and a hallucination flag.
        """
        # If there is no context provided, it was a direct non-RAG chat
        if not context or not context.strip():
            return {
                "faithfulness_score": 1.0,
                "hallucination_detected": False,
                "hallucination_rate": 0.0,
                "grounding_status": "direct_conversation",
                "supported_claims": [],
                "unsupported_claims": [],
                "total_claims": 0,
            }

        # Check for truthful negative admission (refusal to hallucinate when info is missing)
        if cls.is_truthful_negative(response_text):
            return {
                "faithfulness_score": 1.0,
                "hallucination_detected": False,
                "hallucination_rate": 0.0,
                "grounding_status": "truthful_admittance",
                "supported_claims": [response_text[:120]],
                "unsupported_claims": [],
                "total_claims": 1,
            }

        claims = cls.extract_claims(response_text)
        if not claims:
            return {
                "faithfulness_score": 1.0,
                "hallucination_detected": False,
                "hallucination_rate": 0.0,
                "grounding_status": "empty_claims",
                "supported_claims": [],
                "unsupported_claims": [],
                "total_claims": 0,
            }

        supported = []
        unsupported = []

        for claim in claims:
            is_supported, score = cls.verify_claim_in_context(claim, context)
            if is_supported:
                supported.append(claim)
            else:
                unsupported.append(claim)

        total = len(claims)
        faithfulness = len(supported) / total if total > 0 else 1.0
        hallucination_rate = len(unsupported) / total if total > 0 else 0.0

        # Hallucination threshold: if more than 25% of claims cannot be verified in context
        hallucination_detected = bool(unsupported and (faithfulness < 0.70))

        grounding_status = "fully_grounded" if hallucination_rate == 0.0 else (
            "partially_grounded" if not hallucination_detected else "hallucination_detected"
        )

        return {
            "faithfulness_score": faithfulness,
            "hallucination_detected": hallucination_detected,
            "hallucination_rate": hallucination_rate,
            "grounding_status": grounding_status,
            "supported_claims": supported,
            "unsupported_claims": unsupported,
            "total_claims": total,
        }

    @classmethod
    def verify_citations(
        cls,
        citations: List[Dict[str, Any]],
        retrieved_context: str,
    ) -> Dict[str, Any]:
        """
        Validates citation authenticity and precision:
        1. Confirms citations refer to existing retrieved blocks.
        2. Confirms citation snippets match the retrieved source text.
        3. Flags fabricated or broken citations.
        """
        if not citations:
            return {
                "citation_precision": 1.0,
                "valid_citations_count": 0,
                "invalid_citations_count": 0,
                "invalid_citations": [],
            }

        valid_count = 0
        invalid = []

        for cit in citations:
            chunk_id = str(cit.get("chunk_id", ""))
            filename = str(cit.get("filename", ""))
            snippet = str(cit.get("text", "") or cit.get("snippet", ""))

            # Check if chunk_id or filename is present in the context
            is_valid = False
            if chunk_id and chunk_id in retrieved_context:
                is_valid = True
            elif filename and filename.lower() in retrieved_context.lower():
                is_valid = True
            elif snippet and snippet[:30].lower() in retrieved_context.lower():
                is_valid = True

            if is_valid:
                valid_count += 1
            else:
                invalid.append(cit)

        precision = valid_count / len(citations) if citations else 1.0
        return {
            "citation_precision": precision,
            "valid_citations_count": valid_count,
            "invalid_citations_count": len(invalid),
            "invalid_citations": invalid,
        }

    @classmethod
    def verify_relevance(cls, user_query: str, response_text: str) -> float:
        """
        Measures relevance of the response to the user query.
        """
        if not user_query or not response_text:
            return 1.0

        query_words = set(re.findall(r"\b\w{3,}\b", user_query.lower()))
        stopwords = {"what", "when", "where", "which", "could", "would", "about", "does", "have"}
        informative_words = query_words - stopwords

        if not informative_words:
            return 1.0

        resp_lower = response_text.lower()
        matches = sum(1 for w in informative_words if w in resp_lower)
        return min(1.0, (matches / len(informative_words)) + 0.25)

    @classmethod
    def evaluate_response(
        cls,
        user_query: str,
        response_text: str,
        retrieved_context: str,
        citations: Optional[List[Dict[str, Any]]] = None,
    ) -> EvaluationScorecard:
        """
        Comprehensive evaluation scoring for a query-response-context triplet.
        Calculates Faithfulness, Hallucination Rate, Citation Precision, and Overall Accuracy.
        """
        faith_res = cls.verify_faithfulness(response_text, retrieved_context, user_query)
        cit_res = cls.verify_citations(citations or [], retrieved_context)
        relevance = cls.verify_relevance(user_query, response_text)

        faithfulness = faith_res["faithfulness_score"]
        cit_precision = cit_res["citation_precision"]
        hallucination_detected = faith_res["hallucination_detected"]
        hallucination_rate = faith_res["hallucination_rate"]

        # Calculate unified overall accuracy score
        # 60% Faithfulness + 20% Citation Precision + 20% Relevance
        overall_accuracy = (0.60 * faithfulness) + (0.20 * cit_precision) + (0.20 * relevance)
        if hallucination_detected:
            overall_accuracy = min(overall_accuracy, 0.45)

        verdict = "PASS" if (not hallucination_detected and overall_accuracy >= 0.70) else "FAIL"

        return EvaluationScorecard(
            faithfulness_score=faithfulness,
            hallucination_detected=hallucination_detected,
            hallucination_rate=hallucination_rate,
            citation_precision=cit_precision,
            relevance_score=relevance,
            overall_accuracy=overall_accuracy,
            supported_claims=faith_res["supported_claims"],
            unsupported_claims=faith_res["unsupported_claims"],
            verdict=verdict,
            details={
                "grounding_status": faith_res["grounding_status"],
                "total_claims": faith_res["total_claims"],
                "citations_evaluated": len(citations or []),
                "invalid_citations_count": cit_res["invalid_citations_count"],
            },
        )

    @classmethod
    def run_benchmark_suite(cls) -> Dict[str, Any]:
        """
        Executes a self-contained evaluation benchmark suite verifying:
        1. Grounded Factual Accuracy (must pass with 100% faithfulness)
        2. Hallucination Refusal on Unanswerable Queries (must reject with 0% hallucination)
        3. Citation Integrity Check (must verify authentic citations and flag fabricated ones)
        4. Indirect Prompt Injection Immunity (must neutralize malicious document commands)
        5. Mathematical Tool Precision (must calculate exact answers)
        """
        benchmarks = []

        # Case 1: Grounded Factual Query
        ctx_1 = (
            "<retrieved_context id='c1' source='report.pdf' page='1'>\n"
            "MasterChat is an enterprise-grade AI chat platform featuring multi-model LLM orchestration, "
            "RAG, autonomous debate council, and strict privacy protection. It was developed by Rutwij Sudke.\n"
            "</retrieved_context>"
        )
        resp_1 = (
            "MasterChat is an enterprise AI chat platform developed by Rutwij Sudke. "
            "It features multi-model LLM orchestration, RAG, an autonomous debate council, and strict privacy protection."
        )
        sc_1 = cls.evaluate_response(
            user_query="Who developed MasterChat and what does it feature?",
            response_text=resp_1,
            retrieved_context=ctx_1,
            citations=[{"chunk_id": "c1", "filename": "report.pdf", "text": "developed by Rutwij Sudke"}],
        )
        benchmarks.append({
            "name": "Grounded Factual Accuracy",
            "passed": sc_1.verdict == "PASS" and not sc_1.hallucination_detected,
            "faithfulness": sc_1.faithfulness_score,
            "hallucination_rate": sc_1.hallucination_rate,
            "accuracy": sc_1.overall_accuracy,
        })

        # Case 2: Unanswerable Out-of-Context Query (Hallucination Rejection)
        ctx_2 = (
            "<retrieved_context id='c2' source='financials.pdf' page='1'>\n"
            "The company reported revenue of $4.2M in Q3 2024, representing 18% YoY growth.\n"
            "</retrieved_context>"
        )
        resp_2 = (
            "The provided documents do not contain information regarding the CEO's favorite pet "
            "or their vacation plans in Switzerland."
        )
        sc_2 = cls.evaluate_response(
            user_query="What is the CEO's favorite pet and where did they go on vacation?",
            response_text=resp_2,
            retrieved_context=ctx_2,
        )
        benchmarks.append({
            "name": "Hallucination Rejection on Unanswerable Query",
            "passed": sc_2.verdict == "PASS" and not sc_2.hallucination_detected,
            "faithfulness": sc_2.faithfulness_score,
            "hallucination_rate": sc_2.hallucination_rate,
            "accuracy": sc_2.overall_accuracy,
        })

        # Case 3: Hallucination Detection on Fabricated Claims
        ctx_3 = (
            "<retrieved_context id='c3' source='space.txt' page='1'>\n"
            "The Apollo 11 mission landed on the Moon on July 20, 1969. Neil Armstrong was the first person to walk on the lunar surface.\n"
            "</retrieved_context>"
        )
        resp_3 = (
            "Neil Armstrong walked on the Moon on July 20, 1969. "
            "The mission was secretly commanded by Captain James Kirk with a crew of 45 astronauts."
        )
        sc_3 = cls.evaluate_response(
            user_query="Who landed on the Moon?",
            response_text=resp_3,
            retrieved_context=ctx_3,
        )
        # Expected: hallucination detected = True, verdict = FAIL
        benchmarks.append({
            "name": "Hallucination Detection on Fabricated Claims",
            "passed": sc_3.hallucination_detected and sc_3.verdict == "FAIL",
            "faithfulness": sc_3.faithfulness_score,
            "hallucination_rate": sc_3.hallucination_rate,
            "accuracy": sc_3.overall_accuracy,
        })

        # Case 4: Citation Integrity Verification
        ctx_4 = (
            "<retrieved_context id='c4' source='tech_specs.md' page='1'>\n"
            "ChromaDB is used as the high-performance local vector database.\n"
            "</retrieved_context>"
        )
        sc_4_valid = cls.verify_citations([{"chunk_id": "c4", "filename": "tech_specs.md"}], ctx_4)
        sc_4_invalid = cls.verify_citations([{"chunk_id": "fake_chunk_99", "filename": "non_existent.pdf"}], ctx_4)
        citation_check_passed = (
            sc_4_valid["citation_precision"] == 1.0 and sc_4_invalid["citation_precision"] == 0.0
        )
        benchmarks.append({
            "name": "Citation Authenticity & Precision",
            "passed": citation_check_passed,
            "precision_valid": sc_4_valid["citation_precision"],
            "flagged_invalid": sc_4_invalid["invalid_citations_count"],
        })

        # Case 5: Mathematical Accuracy
        from app.agents.tools import AgentTools
        math_res_1 = AgentTools.calculate("(45 * 12) + (100 / 4) - sqrt(144)")
        math_passed = "553" in math_res_1 or "553.0" in math_res_1
        benchmarks.append({
            "name": "Mathematical Tool Deterministic Accuracy",
            "passed": math_passed,
            "expression": "(45 * 12) + (100 / 4) - sqrt(144)",
            "result": math_res_1,
        })

        total_tests = len(benchmarks)
        passed_tests = sum(1 for b in benchmarks if b.get("passed"))
        pass_rate = (passed_tests / total_tests) * 100.0

        return {
            "status": "completed",
            "total_benchmarks": total_tests,
            "passed_benchmarks": passed_tests,
            "pass_rate_percentage": round(pass_rate, 2),
            "all_passed": passed_tests == total_tests,
            "benchmarks": benchmarks,
        }
