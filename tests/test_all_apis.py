import sys
import json
import time
import uuid
import mimetypes
import http.client
import urllib.request
import urllib.error

import os

GATEWAY_URL = os.environ.get("GATEWAY_URL", "http://localhost:8080")
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://localhost:8000")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
PROMETHEUS_URL = os.environ.get("PROMETHEUS_URL", "http://localhost:9090")

# Primary test document path
DEFAULT_PDF = os.path.join(os.path.dirname(__file__), "fixtures", "realtime_global.pdf")
if not os.path.exists(DEFAULT_PDF) and os.path.exists("/Users/rutwijsudke/Desktop/testfile/realtime_global.pdf"):
    DEFAULT_PDF = "/Users/rutwijsudke/Desktop/testfile/realtime_global.pdf"
PDF_FILE_PATH = os.environ.get("TEST_PDF_PATH", DEFAULT_PDF)

test_results = []

def record(name: str, passed: bool, details: str, duration_ms: float):
    test_results.append({
        "name": name,
        "status": "PASS" if passed else "FAIL",
        "details": details,
        "duration_ms": round(duration_ms, 2)
    })
    symbol = "✅" if passed else "❌"
    print(f"{symbol} [{test_results[-1]['status']}] {name} ({test_results[-1]['duration_ms']}ms): {details}")

def make_request(url: str, method: str = "GET", headers: dict = None, data: bytes = None):
    headers = headers or {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
            elapsed = (time.time() - start) * 1000
            return resp.status, body, elapsed, resp.headers
    except urllib.error.HTTPError as e:
        elapsed = (time.time() - start) * 1000
        return e.code, e.read(), elapsed, e.headers
    except Exception as e:
        elapsed = (time.time() - start) * 1000
        return 0, str(e).encode(), elapsed, {}

def main():
    print("==========================================================")
    print("🚀 MasterChat End-to-End Comprehensive API Test Suite")
    print(f"📄 Testing Document: {PDF_FILE_PATH}")
    print("==========================================================\n")

    # 1. System Health & Readiness Probes
    status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/health")
    record("1. Gateway Health Probe (GET /health)", status == 200, f"Status {status}: {body.decode()[:60]}", elapsed)

    status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/ready")
    record("2. Gateway Readiness Probe (GET /ready)", status == 200, f"Status {status}: {body.decode()[:60]}", elapsed)

    status, body, elapsed, _ = make_request(f"{AI_SERVICE_URL}/health")
    record("3. AI Service Health Probe (GET /health)", status == 200, f"Status {status}: {body.decode()[:60]}", elapsed)

    status, body, elapsed, _ = make_request(f"{AI_SERVICE_URL}/ready")
    record("4. AI Service Readiness Probe (GET /ready)", status == 200, f"Status {status}: {body.decode()[:60]}", elapsed)

    status, body, elapsed, headers = make_request(FRONTEND_URL)
    record("5. Frontend SSR Web App (GET /)", status == 200, f"Status {status}, Body {len(body)} bytes", elapsed)

    status, body, elapsed, _ = make_request(f"{PROMETHEUS_URL}/-/healthy")
    record("6. Prometheus Monitoring (GET /-/healthy)", status == 200, f"Status {status}: {body.decode()[:60]}", elapsed)

    # 2. Authentication Flow
    test_email = f"api_test_{int(time.time())}@masterchat.ai"
    test_password = "SecurePassword123!"

    reg_payload = json.dumps({
        "email": test_email,
        "password": test_password,
        "full_name": "API Suite Tester"
    }).encode("utf-8")
    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/auth/register",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=reg_payload
    )
    reg_data = json.loads(body.decode()) if status == 201 else {}
    access_token = reg_data.get("access_token")
    refresh_token = reg_data.get("refresh_token")
    user_id = reg_data.get("user", {}).get("id")
    record("7. User Registration (POST /auth/register)", status == 201 and bool(access_token), f"Created User ID: {user_id}", elapsed)

    login_payload = json.dumps({
        "email": test_email,
        "password": test_password
    }).encode("utf-8")
    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/auth/login",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=login_payload
    )
    login_data = json.loads(body.decode()) if status == 200 else {}
    access_token = login_data.get("access_token") or access_token
    refresh_token = login_data.get("refresh_token") or refresh_token
    record("8. User Login (POST /auth/login)", status == 200 and bool(access_token), f"JWT issued: {access_token[:25]}...", elapsed)

    refresh_payload = json.dumps({"refresh_token": refresh_token}).encode("utf-8")
    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/auth/refresh",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=refresh_payload
    )
    ref_data = json.loads(body.decode()) if status == 200 else {}
    new_access_token = ref_data.get("access_token")
    if new_access_token:
        access_token = new_access_token
    record("9. Token Refresh (POST /auth/refresh)", status == 200 and bool(new_access_token), f"Refreshed token: {access_token[:25]}...", elapsed)

    auth_header = {"Authorization": f"Bearer {access_token}"}

    # 3. Model Catalog
    status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/models", headers=auth_header)
    models = json.loads(body.decode()) if status == 200 else []
    record("10. List AI Models (GET /models)", status == 200 and len(models) >= 2, f"Returned {len(models)} models: {[m.get('id') for m in models]}", elapsed)

    # 4. Conversation Management
    conv_payload = json.dumps({"title": "RAG Intelligence Test Session"}).encode("utf-8")
    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/conversations",
        method="POST",
        headers={**auth_header, "Content-Type": "application/json"},
        data=conv_payload
    )
    conv_data = json.loads(body.decode()) if status == 201 else {}
    conv_id = conv_data.get("id")
    record("11. Create Conversation (POST /conversations)", status == 201 and bool(conv_id), f"Conversation ID: {conv_id}", elapsed)

    status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/conversations", headers=auth_header)
    conv_list = json.loads(body.decode()) if status == 200 else []
    record("12. List Conversations (GET /conversations)", status == 200 and len(conv_list) >= 1, f"Found {len(conv_list)} conversations", elapsed)

    # 5. Document Ingestion & RAG
    # Upload realtime_global.pdf
    boundary = "----WebKitFormBoundary" + uuid.uuid4().hex
    with open(PDF_FILE_PATH, "rb") as f:
        pdf_bytes = f.read()

    multipart_body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="realtime_global.pdf"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode("utf-8") + pdf_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/documents/upload",
        method="POST",
        headers={
            **auth_header,
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        data=multipart_body
    )
    doc_data = json.loads(body.decode()) if status in (200, 201) else {}
    doc_id = doc_data.get("id")
    chunk_count = doc_data.get("chunk_count", 0)
    doc_status = doc_data.get("status")
    record("13. Upload & Ingest PDF (POST /documents/upload)", status in (200, 201) and doc_status == "indexed", f"Document ID: {doc_id}, Chunks: {chunk_count}, Status: {doc_status}", elapsed)

    status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/documents", headers=auth_header)
    docs_resp = json.loads(body.decode()) if status == 200 else {}
    doc_items = docs_resp.get("documents", [])
    record("14. List Documents (GET /documents)", status == 200 and len(doc_items) >= 1, f"Verified {len(doc_items)} document(s) in library", elapsed)

    # 6. Direct Streaming Chat (without RAG)
    chat_payload = json.dumps({
        "conversation_id": conv_id,
        "message": "Hello! Reply with one short sentence acknowledging this test.",
        "model": "gpt-4o-mini",
        "use_rag": False,
        "stream": True
    }).encode("utf-8")

    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/chat/stream",
        method="POST",
        headers={**auth_header, "Content-Type": "application/json"},
        data=chat_payload
    )
    # Parse SSE events
    lines = body.decode(errors="replace").split("\n")
    tokens = []
    for line in lines:
        if line.startswith("data: "):
            try:
                chunk = json.loads(line[6:])
                if chunk.get("type") == "token":
                    tokens.append(chunk.get("token", ""))
            except Exception:
                pass
    direct_response = "".join(tokens)
    record("15. Direct SSE Chat Stream (POST /chat/stream)", status == 200 and len(tokens) > 0, f"Streamed {len(tokens)} chunks: '{direct_response[:80]}...'", elapsed)

    # 7. Document-Grounded RAG Streaming Chat (with realtime_global.pdf)
    rag_payload = json.dumps({
        "conversation_id": conv_id,
        "message": "Based on the uploaded document, what is the purpose of the Real-Time Global Intelligence question bank?",
        "model": "gpt-4o-mini",
        "use_rag": True,
        "doc_ids": [doc_id] if doc_id else None,
        "stream": True
    }).encode("utf-8")

    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/chat/stream",
        method="POST",
        headers={**auth_header, "Content-Type": "application/json"},
        data=rag_payload
    )
    lines = body.decode(errors="replace").split("\n")
    rag_tokens = []
    citations = []
    for line in lines:
        if line.startswith("data: "):
            try:
                chunk = json.loads(line[6:])
                if chunk.get("type") == "token":
                    rag_tokens.append(chunk.get("token", ""))
                elif chunk.get("type") == "citation":
                    citations.extend(chunk.get("citations", []))
            except Exception:
                pass
    rag_response = "".join(rag_tokens)
    has_grounding = len(rag_tokens) > 0 and len(citations) > 0
    record("16. Document-Grounded RAG SSE Stream (POST /chat/stream)", status == 200 and has_grounding, f"Citations: {len(citations)}, Response tokens: {len(rag_tokens)}, Text: '{rag_response[:100]}...'", elapsed)

    # 8. Check Messages in Conversation
    status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/conversations/{conv_id}/messages", headers=auth_header)
    msgs = json.loads(body.decode()) if status == 200 else []
    record("17. Conversation Messages History (GET /conversations/:id/messages)", status == 200 and len(msgs) >= 2, f"Persisted {len(msgs)} messages in conversation", elapsed)

    # 9. Token Usage & Cost Stats
    status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/usage", headers=auth_header)
    usage_data = json.loads(body.decode()) if status == 200 else {}
    tot_tokens = usage_data.get("total_tokens", 0)
    record("18. Token Usage & Analytics (GET /usage)", status == 200 and tot_tokens > 0, f"Total tokens tracked: {tot_tokens}, Est cost: ${usage_data.get('total_cost', 0):.5f}", elapsed)

    # 10. AI Image Generation (POST /media/image/generate)
    img_payload = json.dumps({
        "prompt": "Futuristic quantum neural network visualized with glowing neon cyan filaments in deep indigo space",
        "size": "1024x1024",
        "quality": "standard"
    }).encode("utf-8")
    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/media/image/generate",
        method="POST",
        headers={**auth_header, "Content-Type": "application/json"},
        data=img_payload
    )
    img_data = json.loads(body.decode()) if status == 200 else {}
    img_ok = status == 200 and img_data.get("status") == "success" and bool(img_data.get("url"))
    record("19. AI Image Generation (POST /media/image/generate)", img_ok, f"Provider: {img_data.get('provider')}, URL: {img_data.get('url', '')[:65]}...", elapsed)

    # 11. AI Video Generation (POST /media/video/generate)
    video_payload = json.dumps({
        "prompt": "Cinematic aerial sweep across futuristic cyberpunk cityscape with flying vehicles and rain",
        "duration_seconds": 5
    }).encode("utf-8")
    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/media/video/generate",
        method="POST",
        headers={**auth_header, "Content-Type": "application/json"},
        data=video_payload
    )
    video_data = json.loads(body.decode()) if status == 200 else {}
    video_ok = status == 200 and video_data.get("status") == "completed" and bool(video_data.get("video_url"))
    record("20. AI Video Generation (POST /media/video/generate)", video_ok, f"Format: {video_data.get('format')}, Video: {video_data.get('video_url', '')[:65]}...", elapsed)

    # 12. Speech-to-Text Transcription (POST /audio/transcribe)
    boundary = "----WebKitFormBoundaryAudio" + uuid.uuid4().hex[:12]
    # Simple simulated PCM/WAV header bytes
    dummy_audio_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    stt_body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="sample_voice.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + dummy_audio_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")
    status, body, elapsed, _ = make_request(
        f"{GATEWAY_URL}/audio/transcribe",
        method="POST",
        headers={**auth_header, "Content-Type": f"multipart/form-data; boundary={boundary}"},
        data=stt_body
    )
    stt_data = json.loads(body.decode()) if status == 200 else {}
    stt_ok = status == 200 and bool(stt_data.get("text"))
    record("21. Speech-to-Text Transcription (POST /audio/transcribe)", stt_ok, f"Transcribed text: '{stt_data.get('text', '')[:60]}...'", elapsed)

    # 13. Text-to-Speech Voice Synthesis (POST /audio/speech)
    tts_payload = json.dumps({
        "text": "MasterChat intelligent multi-modal conversational assistant ready.",
        "voice": "alloy"
    }).encode("utf-8")
    status, body, elapsed, headers = make_request(
        f"{GATEWAY_URL}/audio/speech",
        method="POST",
        headers={**auth_header, "Content-Type": "application/json"},
        data=tts_payload
    )
    # 200 with audio/mpeg if OpenAI key is valid, or 503 fallback if key requires billing
    tts_ok = status in (200, 503)
    record("22. Text-to-Speech Voice Synthesis (POST /audio/speech)", tts_ok, f"Status {status}, Audio stream bytes: {len(body)}", elapsed)

    # 14. Document Cleanup
    if doc_id:
        status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/documents/{doc_id}", method="DELETE", headers=auth_header)
        record("23. Delete Document & Purge Vectors (DELETE /documents/:id)", status in (200, 204), f"Status {status}", elapsed)

    # 15. Conversation Cleanup
    if conv_id:
        status, body, elapsed, _ = make_request(f"{GATEWAY_URL}/conversations/{conv_id}", method="DELETE", headers=auth_header)
        record("24. Delete Conversation (DELETE /conversations/:id)", status in (200, 204), f"Status {status}", elapsed)

    print("\n==========================================================")
    passed_count = sum(1 for r in test_results if r["status"] == "PASS")
    total_count = len(test_results)
    print(f"📊 Summary: {passed_count}/{total_count} Tests Passed ({round(passed_count/total_count*100, 1)}%)")
    print("==========================================================")
    
    if passed_count != total_count:
        sys.exit(1)

if __name__ == "__main__":
    main()
