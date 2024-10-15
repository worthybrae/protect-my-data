from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from pydantic import EmailStr
from models import Token, UserUpdate, EmailAdd, AdvertisingIdAdd, RegisterInput, LoginInput, VerifyEmailInput, ResendVerificationInput, User
from database import (
    startup_db_client, 
    shutdown_db_client, 
    update_email_status, 
    update_device_status, 
    get_user_emails_and_devices,
    get_user
)
from auth import (
    register_user, 
    login_user, 
    verify_email, 
    resend_verification, 
    get_current_user, 
    update_user_data, 
    add_email_to_user, 
    add_advertising_id_to_user,
    forgot_password,
    reset_password
)
from config import load_config
from middleware import setup_middlewares
from error_handlers import validation_exception_handler, generic_exception_handler
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis
from logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await startup_db_client()
    # Initialize rate limiter
    redis_client = redis.from_url("redis://localhost", encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_client)
    
    yield
    
    # Shutdown
    await shutdown_db_client()

app = FastAPI(lifespan=lifespan)

# CORS settings
origins = [
    "http://localhost:3000",
    "http://localhost:5000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Setup secure headers middleware
setup_middlewares(app)

config = load_config()

# Exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

@app.post("/register")
async def register(
    input_data: RegisterInput,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    logger.info(f"Registration attempt for email: {input_data.email}")
    return await register_user(input_data.email, input_data.password, input_data.advertising_id, background_tasks)

@app.post("/login", response_model=Token, dependencies=[Depends(RateLimiter(times=5, seconds=60))])
async def login_endpoint(login_data: LoginInput):
    logger.info(f"Login attempt for email: {login_data.email}")
    return await login_user(login_data.email, login_data.password)

@app.post("/verify-email")
async def verify_email_endpoint(verify_data: VerifyEmailInput):
    logger.info(f"Email verification attempt for: {verify_data.email}")
    return await verify_email(verify_data.email, verify_data.code)

@app.post("/resend-verification")
async def resend_verification_endpoint(
    resend_data: ResendVerificationInput,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    logger.info(f"Resending verification email for: {resend_data.email}")
    return await resend_verification(resend_data.email, background_tasks)

@app.put("/update-user")
async def update_user(user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    logger.info(f"User update attempt for user ID: {current_user['_id']}")
    return await update_user_data(str(current_user["_id"]), user_update)

@app.post("/add-email")
async def add_new_email(email_add: EmailAdd, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    logger.info(f"Adding new email for user ID: {current_user['_id']}")
    return await add_email_to_user(str(current_user["_id"]), email_add, background_tasks)

@app.post("/add-advertising-id")
async def add_new_advertising_id(ad_id_add: AdvertisingIdAdd, current_user: dict = Depends(get_current_user)):
    logger.info(f"Adding new advertising ID for user ID: {current_user['_id']}")
    return await add_advertising_id_to_user(str(current_user["_id"]), ad_id_add)

@app.post("/forgot-password")
async def forgot_password_request(email: EmailStr, background_tasks: BackgroundTasks):
    logger.info(f"Password reset request for email: {email}")
    return await forgot_password(email, background_tasks)

@app.post("/reset-password")
async def reset_password_request(email: EmailStr, reset_code: str, new_password: str):
    logger.info(f"Password reset attempt for email: {email}")
    return await reset_password(email, reset_code, new_password)

@app.put("/disable-advertising-id/{advertising_id}")
async def disable_advertising_id(advertising_id: str, current_user: dict = Depends(get_current_user)):
    logger.info(f"Disabling advertising ID for user ID: {current_user['_id']}")
    result = await update_device_status(str(current_user["_id"]), advertising_id, "disabled")
    return {"message": "Advertising ID disabled successfully"} if result else {"message": "Advertising ID not found"}

@app.put("/disable-email/{email}")
async def disable_email(email: EmailStr, current_user: dict = Depends(get_current_user)):
    logger.info(f"Disabling email for user ID: {current_user['_id']}")
    result = await update_email_status(str(current_user["_id"]), email, "disabled")
    return {"message": "Email disabled successfully"} if result else {"message": "Email not found"}

@app.get("/user-data")
async def get_user_data(current_user: User = Depends(get_current_user)):
    logger.info(f"Fetching user data for user ID: {current_user.id}")
    return await get_user_emails_and_devices(str(current_user.id))

@app.get("/check-verification/{email}")
async def check_user_verification(email: EmailStr):
    logger.info(f"Checking verification status for email: {email}")
    user = await get_user(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": email, "is_verified": user.get("is_verified", False)}

@app.get("/health")
async def health_check():
    try:
        await startup_db_client()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "database": "disconnected"}
