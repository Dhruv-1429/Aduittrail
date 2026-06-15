from fastapi import APIRouter, Request, Depends, Query, HTTPException
from fastapi.security import HTTPBearer
from schemas import (UserSchema, UserSignInSchema, AdminSignInSchema,
                     AuditLogSchema, ActivityLogSchema,
                     AuditLogResponseSchema, ActivityLogResponseSchema,
                     UpdateProfileSchema, RoleUpdateSchema)
import httpx
from datetime import datetime
import os
from database import db
from pydantic import BaseModel

router = APIRouter()

SPRING_URL = os.getenv("SPRING_URL", "http://localhost:8081")
NODE_URL = os.getenv("NODE_URL", "http://localhost:3001")

# Initializes the Swagger UI "Authorize" button
security = HTTPBearer(auto_error=False)


# Helper to safely parse JSON from backend responses
def safe_json(response):
    try:
        return response.json()
    except Exception:
        return {"error": response.text, "status_code": response.status_code}


# ===================== POST APIs (UNPROTECTED) =====================

@router.post("/registerUser", tags=["User"])
async def create(user: UserSchema):
    """Register a new user with email, password, phone and website selection."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SPRING_URL}/registerUser",
            json={
                "name": user.name,
                "email": user.email,
                "password": user.password,
                "phone": user.phone,
                "websiteName": user.websiteName
            }
        )
        print("USER REGISTRATION:", response.status_code)

        try:
            await db.gateway_logs.insert_one({
                "action": "REGISTER_USER",
                "email": user.email,
                "websiteName": user.websiteName,
                "status_code": response.status_code,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            print(f"MongoDB Logging Error: {e}")

        return safe_json(response)


@router.post("/signInUser", tags=["User"])
async def signin(user: UserSignInSchema):
    """User sign-in — creates activity log for success/failure."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SPRING_URL}/signInUser",
            json={
                "email": user.email,
                "password": user.password,
            }
        )
        print("USER SIGN IN:", response.status_code)

        try:
            await db.gateway_logs.insert_one({
                "action": "SIGN_IN",
                "email": user.email,
                "status_code": response.status_code,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            print(f"MongoDB Logging Error: {e}")

        return safe_json(response)


@router.post("/adminSignIn", tags=["Admin"])
async def admin_signin(user: AdminSignInSchema):
    """Admin sign-in — validates admin role and returns JWT token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SPRING_URL}/adminSignIn",
            json={
                "email": user.email,
                "password": user.password,
            }
        )
        print("ADMIN SIGN IN:", response.status_code)

        try:
            await db.gateway_logs.insert_one({
                "action": "ADMIN_SIGN_IN",
                "email": user.email,
                "status_code": response.status_code,
                "timestamp": datetime.utcnow()
            })
        except Exception as e:
            print(f"MongoDB Logging Error: {e}")

        return safe_json(response)


# ===================== DASHBOARD APIs (PROTECTED) =====================

@router.get("/api/admin/dashboard/stats", dependencies=[Depends(security)], tags=["Dashboard"])
async def get_dashboard_stats(request: Request):
    """Get overview statistics: total users, audit counts, website stats.
    Merges data from Spring Boot (users) and Node.js (logs)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        # Fetch aggregated stats from Spring Boot (which internally calls Node.js)
        response = await client.get(
            f"{SPRING_URL}/api/admin/dashboard/stats",
            headers=headers
        )
        return safe_json(response)


@router.get("/api/admin/dashboard/website-breakdown", dependencies=[Depends(security)], tags=["Dashboard"])
async def get_website_breakdown(request: Request):
    """Get per-website breakdown with user counts and action statistics."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPRING_URL}/api/admin/dashboard/website-breakdown",
            headers=headers
        )
        return safe_json(response)


@router.get("/api/admin/dashboard/recent-activity", dependencies=[Depends(security)], tags=["Dashboard"])
async def get_recent_activity(request: Request):
    """Get recent audit and activity log entries from Node.js Log Service."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPRING_URL}/api/admin/dashboard/recent-activity",
            headers=headers
        )
        return safe_json(response)


# ===================== ADMIN USER MANAGEMENT APIs (PROTECTED) =====================

@router.get("/api/admin/users", dependencies=[Depends(security)], tags=["Admin"])
async def get_all_users(request: Request, includeInactive: bool = False):
    """Get all registered users (admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPRING_URL}/api/admin/users",
            params={"includeInactive": str(includeInactive).lower()},
            headers=headers
        )
        return safe_json(response)


@router.get("/api/admin/users/website", dependencies=[Depends(security)], tags=["Admin"])
async def get_users_by_website(websiteName: str, request: Request):
    """Get users filtered by website name (admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPRING_URL}/api/admin/users/website",
            params={"websiteName": websiteName},
            headers=headers
        )
        return safe_json(response)


@router.delete("/api/admin/users/{user_id}", dependencies=[Depends(security)], tags=["Admin"])
async def delete_user(user_id: int, request: Request):
    """Delete a user permanently (admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{SPRING_URL}/api/admin/users/{user_id}",
            headers=headers
        )
        return safe_json(response)


@router.put("/api/admin/users/{user_id}/deactivate", dependencies=[Depends(security)], tags=["Admin"])
async def deactivate_user(user_id: int, request: Request):
    """Soft delete — deactivate a user (admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{SPRING_URL}/api/admin/users/{user_id}/deactivate",
            headers=headers
        )
        return safe_json(response)


@router.put("/api/admin/users/{user_id}/activate", dependencies=[Depends(security)], tags=["Admin"])
async def activate_user(user_id: int, request: Request):
    """Reactivate a user (admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{SPRING_URL}/api/admin/users/{user_id}/activate",
            headers=headers
        )
        return safe_json(response)


@router.put("/api/admin/users/{user_id}/role", dependencies=[Depends(security)], tags=["Admin"])
async def change_user_role(user_id: int, body: RoleUpdateSchema, request: Request):
    """Change user role: USER ↔ ADMIN (admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{SPRING_URL}/api/admin/users/{user_id}/role",
            json={"role": body.role},
            headers=headers
        )
        return safe_json(response)


@router.put("/api/admin/profile", dependencies=[Depends(security)], tags=["Admin"])
async def update_admin_profile(body: UpdateProfileSchema, request: Request):
    """Update admin name or change password."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    payload = {}
    if body.name:
        payload["name"] = body.name
    if body.oldPassword and body.newPassword:
        payload["oldPassword"] = body.oldPassword
        payload["newPassword"] = body.newPassword

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{SPRING_URL}/api/admin/profile",
            json=payload,
            headers=headers
        )
        return safe_json(response)


@router.get("/api/admin/token-info", dependencies=[Depends(security)], tags=["Admin"])
async def get_token_info(request: Request):
    """Get token expiry info."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPRING_URL}/api/admin/token-info",
            headers=headers
        )
        return safe_json(response)


# ===================== USER PROFILE APIs (PROTECTED) =====================

@router.put("/api/user/profile", dependencies=[Depends(security)], tags=["User"])
async def update_user_profile(body: UpdateProfileSchema, request: Request):
    """Update user name or change password (for regular users)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    payload = {}
    if body.name:
        payload["name"] = body.name
    if body.oldPassword and body.newPassword:
        payload["oldPassword"] = body.oldPassword
        payload["newPassword"] = body.newPassword

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{SPRING_URL}/api/user/profile",
            json=payload,
            headers=headers
        )
        return safe_json(response)


@router.get("/api/user/token-info", dependencies=[Depends(security)], tags=["User"])
async def get_user_token_info(request: Request):
    """Get user token expiry info."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPRING_URL}/api/user/token-info",
            headers=headers
        )
        return safe_json(response)


# ===================== WEBSITE APIs (PROTECTED) =====================

@router.get("/getAllUsersOfWebsite", dependencies=[Depends(security)], tags=["Websites"])
async def get_all_users_of_website(websiteName: str, request: Request):
    """Get all users, active users, and deleted users for a specific website."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SPRING_URL}/getAllUsersOfWebsite",
            params={"websiteName": websiteName},
            headers=headers
        )
        return safe_json(response)


# ===================== AUDIT LOG APIs (PROTECTED → Node.js) =====================

@router.post("/api/audit/logs", tags=["Audit Logs"])
async def create_audit_log(request: Request):
    """Create a new audit log entry (proxies to Node.js Log Service)."""
    try:
        data = await request.json()
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{NODE_URL}/api/audit/logs", json=data)
            return safe_json(response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with log service: {str(e)}")


@router.get("/api/audit/logs/search", dependencies=[Depends(security)], tags=["Audit Logs"])
async def search_audit_logs(request: Request, websiteName: str = None, userEmail: str = None, 
                            status: str = None, action: str = None, 
                            startDate: str = None, endDate: str = None,
                            page: int = 1, limit: int = 50, search: str = None):
    """Unified search for audit logs."""
    params = {"page": page, "limit": limit}
    if websiteName: params["websiteName"] = websiteName
    if userEmail: params["userEmail"] = userEmail
    if status: params["status"] = status
    if action: params["action"] = action
    if startDate: params["startDate"] = startDate
    if endDate: params["endDate"] = endDate
    if search: params["search"] = search
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/search", params=params)
        return safe_json(response)


@router.get("/api/audit/logs/website", dependencies=[Depends(security)], tags=["Audit Logs"])
async def get_audit_logs_by_website(websiteName: str, request: Request,
                                     page: int = 1, limit: int = 50, search: str = None):
    """Get audit logs filtered by website name (from Node.js Log Service)."""
    params = {"websiteName": websiteName, "page": page, "limit": limit}
    if search:
        params["search"] = search
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/website", params=params)
        return safe_json(response)


@router.get("/api/audit/logs/user", dependencies=[Depends(security)], tags=["Audit Logs"])
async def get_audit_logs_by_user(userEmail: str, request: Request,
                                  page: int = 1, limit: int = 50, search: str = None):
    """Get audit logs filtered by user email (from Node.js Log Service)."""
    params = {"userEmail": userEmail, "page": page, "limit": limit}
    if search:
        params["search"] = search
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/user", params=params)
        return safe_json(response)


@router.get("/api/audit/logs/daterange", dependencies=[Depends(security)], tags=["Audit Logs"])
async def get_audit_logs_by_daterange(websiteName: str, startTime: str, endTime: str, request: Request,
                                       page: int = 1, limit: int = 50):
    """Get audit logs within a specific date range (from Node.js Log Service)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NODE_URL}/api/audit/logs/daterange",
            params={"websiteName": websiteName, "startTime": startTime, "endTime": endTime,
                     "page": page, "limit": limit}
        )
        return safe_json(response)


@router.get("/api/audit/logs/failed", dependencies=[Depends(security)], tags=["Audit Logs"])
async def get_failed_audits(request: Request, page: int = 1, limit: int = 50):
    """Get all failed audit log entries (from Node.js Log Service)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/failed",
                                     params={"page": page, "limit": limit})
        return safe_json(response)


@router.get("/api/audit/logs/user-website", dependencies=[Depends(security)], tags=["Audit Logs"])
async def get_audit_logs_by_user_and_website(userEmail: str, websiteName: str, request: Request,
                                              page: int = 1, limit: int = 50):
    """Get audit logs filtered by both user email and website (from Node.js Log Service)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NODE_URL}/api/audit/logs/user-website",
            params={"userEmail": userEmail, "websiteName": websiteName,
                     "page": page, "limit": limit}
        )
        return safe_json(response)


@router.get("/api/audit/logs/timeseries", dependencies=[Depends(security)], tags=["Analytics"])
async def get_audit_timeseries(request: Request, days: int = 30):
    """Get daily audit log counts for the last N days."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/timeseries",
                                     params={"days": days})
        return safe_json(response)


@router.get("/api/audit/logs/suspicious", dependencies=[Depends(security)], tags=["Analytics"])
async def get_suspicious_activity(request: Request, minutes: int = 60, threshold: int = 3):
    """Get users with suspicious login patterns (3+ failed in time window)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/suspicious",
                                     params={"minutes": minutes, "threshold": threshold})
        return safe_json(response)


@router.get("/api/audit/logs/aggregations", dependencies=[Depends(security)], tags=["Analytics"])
async def get_audit_aggregations(request: Request):
    """Get audit log aggregations: top users, peak hours, failure rates."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/aggregations", headers=headers)
        return safe_json(response)


@router.get("/api/audit/logs/user-history/{email}", dependencies=[Depends(security)], tags=["Audit Logs"])
async def get_audit_user_history(email: str, request: Request,
                                  page: int = 1, limit: int = 50):
    """Get all audit logs for a specific user."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/audit/logs/user-history/{email}",
                                     params={"page": page, "limit": limit}, headers=headers)
        return safe_json(response)


# ===================== ACTIVITY LOG APIs (PROTECTED → Node.js) =====================

@router.post("/api/activity/logs", tags=["Activity Logs"])
async def create_activity_log(request: Request):
    """Create a new activity log entry (proxies to Node.js Log Service)."""
    try:
        data = await request.json()
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{NODE_URL}/api/activity/logs", json=data)
            return safe_json(response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with log service: {str(e)}")


@router.get("/api/activity/logs/search", dependencies=[Depends(security)], tags=["Activity Logs"])
async def search_activity_logs(request: Request, websiteName: str = None, userEmail: str = None, 
                                activityType: str = None, severity: str = None, 
                                startDate: str = None, endDate: str = None,
                                page: int = 1, limit: int = 50, search: str = None):
    """Unified search for activity logs."""
    params = {"page": page, "limit": limit}
    if websiteName: params["websiteName"] = websiteName
    if userEmail: params["userEmail"] = userEmail
    if activityType: params["activityType"] = activityType
    if severity: params["severity"] = severity
    if startDate: params["startDate"] = startDate
    if endDate: params["endDate"] = endDate
    if search: params["search"] = search
    
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/search", params=params, headers=headers)
        return safe_json(response)


@router.get("/api/activity/logs/website", dependencies=[Depends(security)], tags=["Activity Logs"])
async def get_activity_logs_by_website(websiteName: str, request: Request,
                                        page: int = 1, limit: int = 50, search: str = None):
    """Get activity logs filtered by website name (from Node.js Log Service)."""
    params = {"websiteName": websiteName, "page": page, "limit": limit}
    if search:
        params["search"] = search
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/website", params=params)
        return safe_json(response)


@router.get("/api/activity/logs/user", dependencies=[Depends(security)], tags=["Activity Logs"])
async def get_activity_logs_by_user(userEmail: str, request: Request,
                                     page: int = 1, limit: int = 50, search: str = None):
    """Get activity logs filtered by user email (from Node.js Log Service)."""
    params = {"userEmail": userEmail, "page": page, "limit": limit}
    if search:
        params["search"] = search
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/user", params=params)
        return safe_json(response)


@router.get("/api/activity/logs/type", dependencies=[Depends(security)], tags=["Activity Logs"])
async def get_activity_logs_by_type(activityType: str, request: Request,
                                     page: int = 1, limit: int = 50):
    """Get activity logs filtered by activity type (from Node.js Log Service)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/type",
                                     params={"activityType": activityType, "page": page, "limit": limit})
        return safe_json(response)


@router.get("/api/activity/logs/severity", dependencies=[Depends(security)], tags=["Activity Logs"])
async def get_activity_logs_by_severity(severity: str, request: Request,
                                         page: int = 1, limit: int = 50):
    """Get activity logs filtered by severity level (from Node.js Log Service)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/severity",
                                     params={"severity": severity, "page": page, "limit": limit})
        return safe_json(response)


@router.get("/api/activity/logs/daterange", dependencies=[Depends(security)], tags=["Activity Logs"])
async def get_activity_logs_by_daterange(websiteName: str, startTime: str, endTime: str, request: Request,
                                          page: int = 1, limit: int = 50):
    """Get activity logs within a specific date range (from Node.js Log Service)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NODE_URL}/api/activity/logs/daterange",
            params={"websiteName": websiteName, "startTime": startTime, "endTime": endTime,
                     "page": page, "limit": limit}
        )
        return safe_json(response)


@router.get("/api/activity/logs/timeseries", dependencies=[Depends(security)], tags=["Analytics"])
async def get_activity_timeseries(request: Request, days: int = 30):
    """Get daily activity log counts for the last N days."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/timeseries",
                                     params={"days": days})
        return safe_json(response)


@router.get("/api/activity/logs/aggregations", dependencies=[Depends(security)], tags=["Analytics"])
async def get_activity_aggregations(request: Request):
    """Get activity log aggregations: type distribution, busiest hours, severity."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/aggregations")
        return safe_json(response)


@router.get("/api/activity/logs/user-history/{email}", dependencies=[Depends(security)], tags=["Activity Logs"])
async def get_activity_user_history(email: str, request: Request,
                                     page: int = 1, limit: int = 50):
    """Get all activity logs for a specific user."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{NODE_URL}/api/activity/logs/user-history/{email}",
                                     params={"page": page, "limit": limit})
        return safe_json(response)


# ===================== HEALTH CHECK APIs =====================

@router.get("/api/health/all", tags=["Health"])
async def get_all_health():
    """Check health of all backend services."""
    results = {}

    # Gateway (self)
    results["gateway"] = {"status": "UP", "service": "FastAPI Gateway", "port": 8000}

    # Spring Boot
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{SPRING_URL}/checker")
            data = safe_json(resp)
            results["springBoot"] = {"status": "UP", "port": 8081, **data}
        except Exception as e:
            results["springBoot"] = {"status": "DOWN", "port": 8081, "error": str(e)}

        # Node.js
        try:
            resp = await client.get(f"{NODE_URL}/health")
            data = safe_json(resp)
            results["nodeJs"] = {"status": "UP", "port": 3001, **data}
        except Exception as e:
            results["nodeJs"] = {"status": "DOWN", "port": 3001, "error": str(e)}

    # MongoDB (check via gateway db)
    try:
        await db.command("ping")
        results["mongodb"] = {"status": "UP", "service": "MongoDB Atlas"}
    except Exception as e:
        results["mongodb"] = {"status": "DOWN", "error": str(e)}

    return results


# ===================== PAYMENTS APIs =====================

class PaymentSchema(BaseModel):
    amount: float
    currency: str = "USD"

@router.post("/api/payments", dependencies=[Depends(security)], tags=["Payments"])
async def create_payment(payment: PaymentSchema, request: Request):
    """Create a new payment."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NODE_URL}/api/payments",
            json={"amount": payment.amount, "currency": payment.currency},
            headers=headers
        )
        return safe_json(response)


@router.get("/api/payments/user-history/{email}", dependencies=[Depends(security)], tags=["Payments"])
async def get_user_payments(email: str, request: Request):
    """Get payment history for a user."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NODE_URL}/api/payments/user-history/{email}",
            headers=headers
        )
        return safe_json(response)


@router.get("/api/admin/payments/search", dependencies=[Depends(security)], tags=["Payments"])
async def search_payments(request: Request, page: int = 1, limit: int = 50, userEmail: str = None, transactionId: str = None):
    """Search all payments (Admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    params = {"page": page, "limit": limit}
    if userEmail: params["userEmail"] = userEmail
    if transactionId: params["transactionId"] = transactionId

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NODE_URL}/api/payments/search",
            params=params,
            headers=headers
        )
        return safe_json(response)

@router.get("/api/admin/payments/recent", dependencies=[Depends(security)], tags=["Payments"])
async def recent_payments(request: Request):
    """Get recent payments (Admin only)."""
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{NODE_URL}/api/payments/recent",
            headers=headers
        )
        return safe_json(response)