from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ============ USER SCHEMAS ============

class UserSchema(BaseModel):
    name: str
    email: str
    password: str
    phone: int
    websiteName: str  # The website they are registering for

class UserSignInSchema(BaseModel):
    email: str
    password: str

class AdminSignInSchema(BaseModel):
    email: str
    password: str

# ============ ADMIN PROFILE SCHEMAS ============

class ChangePasswordSchema(BaseModel):
    oldPassword: str
    newPassword: str

class UpdateProfileSchema(BaseModel):
    name: Optional[str] = None
    oldPassword: Optional[str] = None
    newPassword: Optional[str] = None

class RoleUpdateSchema(BaseModel):
    role: str  # "USER" or "ADMIN"

# ============ AUDIT LOG SCHEMAS ============

class AuditLogSchema(BaseModel):
    userEmail: str
    action: str
    websiteName: str
    details: Optional[str] = None
    ipAddress: str
    status: str
    errorMessage: Optional[str] = None

class AuditLogResponseSchema(BaseModel):
    id: int
    userEmail: str
    action: str
    websiteName: str
    details: Optional[str]
    ipAddress: str
    timestamp: datetime
    status: str
    errorMessage: Optional[str]

# ============ ACTIVITY LOG SCHEMAS ============

class ActivityLogSchema(BaseModel):
    userEmail: str
    activityType: str
    websiteName: str
    description: Optional[str] = None
    resourceName: Optional[str] = None
    durationInSeconds: Optional[int] = None
    sessionId: Optional[str] = None
    severity: str

class ActivityLogResponseSchema(BaseModel):
    id: int
    userEmail: str
    activityType: str
    websiteName: str
    description: Optional[str]
    resourceName: Optional[str]
    activityTime: datetime
    durationInSeconds: Optional[int]
    sessionId: Optional[str]
    severity: str