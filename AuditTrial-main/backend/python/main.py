from fastapi import FastAPI, Request, Response
from routes import router
from fastapi.middleware.cors import CORSMiddleware
from database import db
from datetime import datetime
import time


app = FastAPI(
    title="AuditCore Gateway API",
    description="API Gateway for the Audit Trail & Activity Log Dashboard. Proxies requests to Spring Boot backend and logs to MongoDB Atlas.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS must be added BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== RATE LIMITING (in-memory, simple) =====================
# Tracks requests per IP per minute. Resets every minute.

rate_limit_store = {}
RATE_LIMIT_MAX = 200  # max requests per minute per IP
RATE_LIMIT_WINDOW = 60  # seconds


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()

    # Clean old entries
    if client_ip in rate_limit_store:
        rate_limit_store[client_ip] = [
            t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW
        ]
    else:
        rate_limit_store[client_ip] = []

    # Check rate limit
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        return Response(
            content='{"error": "Rate limit exceeded. Try again later."}',
            status_code=429,
            media_type="application/json"
        )

    rate_limit_store[client_ip].append(now)

    # Process request and log
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    # ===================== REQUEST/RESPONSE LOGGING =====================
    # Log to MongoDB (fire-and-forget, don't block)
    try:
        log_entry = {
            "method": request.method,
            "path": str(request.url.path),
            "query": str(request.url.query) if request.url.query else None,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": client_ip,
            "timestamp": datetime.utcnow()
        }
        # Only log non-health-check requests to keep logs clean
        if not request.url.path.startswith("/docs") and not request.url.path.startswith("/redoc") \
           and not request.url.path.startswith("/openapi"):
            await db.request_logs.insert_one(log_entry)
    except Exception as e:
        print(f"Request logging error: {e}")

    return response


app.include_router(router)


@app.get("/checker", tags=["Health"])
def checkerFunction():
    """Health check endpoint to verify gateway is running."""
    return {"isOK": "YES", "service": "AuditCore Gateway", "version": "2.0.0"}