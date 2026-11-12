import math
import re
import ast
import operator
import logging
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Safe operators for calculator
SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_FUNCTIONS = {
    "abs": abs,
    "round": round,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "pi": math.pi,
    "e": math.e,
}


def safe_eval_expr(node: ast.AST) -> Any:
    if isinstance(node, ast.Expression):
        return safe_eval_expr(node.body)
    elif isinstance(node, ast.Constant):
        return node.value
    elif isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Operator {op_type.__name__} is not allowed")
        left = safe_eval_expr(node.left)
        right = safe_eval_expr(node.right)
        return SAFE_OPERATORS[op_type](left, right)
    elif isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Unary operator {op_type.__name__} is not allowed")
        operand = safe_eval_expr(node.operand)
        return SAFE_OPERATORS[op_type](operand)
    elif isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ValueError("Only simple function calls are allowed")
        func_name = node.func.id
        if func_name not in SAFE_FUNCTIONS:
            raise ValueError(f"Function {func_name} is not permitted")
        args = [safe_eval_expr(arg) for arg in node.args]
        return SAFE_FUNCTIONS[func_name](*args)
    elif isinstance(node, ast.Name):
        if node.id in SAFE_FUNCTIONS:
            return SAFE_FUNCTIONS[node.id]
        raise ValueError(f"Identifier {node.id} is not permitted")
    else:
        raise ValueError(f"AST node type {type(node).__name__} is not allowed")


class AgentTools:
    """Collection of agent tools: calculator, web search, file Q&A, and sandboxed code execution."""

    @staticmethod
    def calculate(expression: str) -> str:
        """Safely calculate a mathematical expression."""
        try:
            # Clean expression
            clean_expr = expression.strip().replace("^", "**")
            parsed = ast.parse(clean_expr, mode="eval")
            result = safe_eval_expr(parsed)
            return f"Result: {result}"
        except Exception as e:
            return f"Calculation error: {str(e)}"

    @staticmethod
    async def web_search_structured(query: str, max_results: int = 4) -> List[Dict[str, Any]]:
        """Perform a structured web search using DuckDuckGo HTML, extracting title, snippet, domain, and target URL."""
        results: List[Dict[str, Any]] = []
        try:
            url = f"https://html.duckduckgo.com/html/?q={httpx.URL(query)}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code != 200:
                    logger.warning(f"DuckDuckGo returned HTTP {resp.status_code}")
                    return []

                soup = BeautifulSoup(resp.text, "html.parser")
                for item in soup.find_all("div", class_="result__body", limit=max_results):
                    title_elem = item.find("a", class_="result__url") or item.find("h2")
                    snippet_elem = item.find("a", class_="result__snippet")
                    
                    raw_title = title_elem.get_text().strip() if title_elem else "Web Result"
                    raw_link = title_elem.get("href", "") if title_elem else ""

                    # Extract actual destination URL if wrapped in DuckDuckGo redirect
                    if "uddg=" in raw_link:
                        qs = urllib.parse.parse_qs(urllib.parse.urlparse(raw_link).query)
                        raw_link = qs.get("uddg", [raw_link])[0]

                    snippet = snippet_elem.get_text().strip() if snippet_elem else ""
                    if not snippet:
                        continue

                    # Extract domain for cleaner title
                    domain = ""
                    if raw_link.startswith("http"):
                        domain = urllib.parse.urlparse(raw_link).netloc.replace("www.", "")

                    results.append({
                        "title": domain or raw_title,
                        "url": raw_link,
                        "domain": domain,
                        "snippet": snippet,
                    })

        except Exception as e:
            logger.warning(f"Structured web search error: {e}")

        return results

    @staticmethod
    async def web_search(query: str, max_results: int = 3) -> str:
        """Perform a web search using DuckDuckGo HTML search."""
        structured = await AgentTools.web_search_structured(query, max_results=max_results)
        if not structured:
            return f"No live search results found for query: '{query}'"
        return "\n\n".join(f"• [{r['title']}] ({r['url']}): {r['snippet']}" for r in structured)

    @staticmethod
    def execute_python_sandboxed(code: str, enabled: bool = False) -> str:
        """Sandboxed Python code execution. Disabled by default for security."""
        if not enabled:
            return "Code interpreter is disabled by default for security reasons. Enable in settings if required."
        try:
            # Restrict builtins in sandboxed exec
            safe_globals = {"__builtins__": {"abs": abs, "min": min, "max": max, "sum": sum, "len": len, "range": range, "print": print}}
            safe_locals = {}
            exec(code, safe_globals, safe_locals)
            return f"Execution success: {safe_locals}"
        except Exception as e:
            return f"Execution error: {str(e)}"
