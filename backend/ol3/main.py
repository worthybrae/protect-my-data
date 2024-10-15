from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timedelta, timezone
from config import settings
from helpers import send_verification_email, generate_verification_code
from models import EmailCreate, EmailVerify, DeviceCreate

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

security = HTTPBearer()

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Use this function as a dependency in your endpoints
async def get_authenticated_client(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Client:
    client = get_supabase_client()
    client.postgrest.auth(credentials.credentials)
    return client

# Email endpoints
@app.post("/emails")
@limiter.limit("5/minute")
async def add_email(request: Request, email: EmailCreate, client: Client = Depends(get_authenticated_client)):
    try:
        response = client.table("emails").insert({
            "email_address": email.email_address,
            "status": "pending",
            "verification_code": generate_verification_code(),
            "verification_code_expires_at": (datetime.now() + timedelta(minutes=5)).isoformat()
        }).execute()
        
        if response.error:
            raise Exception(f"Supabase error: {response.error.message}")

        send_verification_email(email.email_address, response.data[0]["verification_code"])
        
        return {"message": "Email added successfully, verification email sent", "email_id": response.data[0]["id"]}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in add_email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@app.post("/emails/verify")
@limiter.limit("10/minute")
async def verify_email(request: Request, email_verify: EmailVerify, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        supabase_client = get_supabase_client(credentials.credentials)
        
        email_record = supabase_client.table("emails").select("*").eq("id", email_verify.email_id).single().execute()
        
        if not email_record.data:
            raise HTTPException(status_code=404, detail="Email not found")
        
        if email_record.data["status"] != "pending":
            raise HTTPException(status_code=400, detail="Email already verified or disabled")
        
        if datetime.fromisoformat(email_record.data["verification_code_expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Verification code has expired")
        
        if email_verify.verification_code != email_record.data["verification_code"]:
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        current_time = datetime.now(timezone.utc).isoformat()
        response = supabase_client.table("emails").update({
            "status": "active", 
            "verification_code": None,
            "verification_code_expires_at": None,
            "updated_at": current_time
        }).eq("id", email_verify.email_id).execute()
        
        return {"message": "Email verified successfully"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in verify_email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to verify email")

@app.put("/emails/{email_id}/disable")
@limiter.limit("10/minute")
async def disable_email(request: Request, email_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        supabase_client = get_supabase_client(credentials.credentials)
        
        current_time = datetime.now(timezone.utc).isoformat()
        response = supabase_client.table("emails").update({
            "status": "disabled",
            "updated_at": current_time
        }).eq("id", email_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Email not found or unauthorized")
        
        return {"message": "Email disabled successfully"}
    except Exception as e:
        logger.error(f"Error in disable_email: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to disable email")

# Device endpoints
@app.post("/devices")
@limiter.limit("5/minute")
async def add_device(request: Request, device: DeviceCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        supabase_client = get_supabase_client(credentials.credentials)
        
        response = supabase_client.table("devices").insert({
            "advertising_id": device.advertising_id,
            "status": "active"
        }).execute()
        return {"message": "Device added successfully", "device_id": response.data[0]["id"]}
    except Exception as e:
        logger.error(f"Error in add_device: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add device")

@app.put("/devices/{device_id}/disable")
@limiter.limit("10/minute")
async def disable_device(request: Request, device_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        supabase_client = get_supabase_client(credentials.credentials)
        
        response = supabase_client.table("devices").update({"status": "disabled"}).eq("id", device_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Device not found or unauthorized")
        return {"message": "Device disabled successfully"}
    except Exception as e:
        logger.error(f"Error in disable_device: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to disable device")

# User data endpoints
@app.get("/users/me/emails")
@limiter.limit("30/minute")
async def get_user_emails(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    supabase_client = get_supabase_client(credentials.credentials)
    response = supabase_client.table("emails").select("*").execute()
    return response.data

@app.get("/users/me/devices")
@limiter.limit("30/minute")
async def get_user_devices(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    supabase_client = get_supabase_client(credentials.credentials)
    response = supabase_client.table("devices").select("*").execute()
    return response.data

