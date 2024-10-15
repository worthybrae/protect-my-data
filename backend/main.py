from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import os
import random
import string
from contextlib import asynccontextmanager
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis
import hashlib

load_dotenv()

# SendGrid setup
sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
sendgrid_from_email = os.getenv("SENDGRID_FROM_EMAIL")

# Redis setup for rate limiting
redis_url = os.getenv("REDIS_URL", "redis://localhost")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    redis_client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_client)
    yield
    # Shutdown
    await redis_client.close()

app = FastAPI(lifespan=lifespan)

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmailSendRequest(BaseModel):
    email_address: EmailStr

def generate_verification_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def hash_code(code: str):
    return hashlib.sha256(code.encode()).hexdigest()

def send_verification_email(to_email: str, code: str):
    message = Mail(
        from_email=sendgrid_from_email,
        to_emails=to_email,
        subject='Verify your email',
        html_content=f'<strong>Your verification code is: {code}</strong><br>This code will expire in 5 minutes.'
    )
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        response = sg.send(message)
        print(f"Email sent. Status Code: {response.status_code}")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

@app.post("/send-verification-email")
async def send_email(
    email_request: EmailSendRequest,
    rate_limiter: RateLimiter = Depends(RateLimiter(times=30, seconds=3600))  # 5 requests per hour
):
    verification_code = generate_verification_code()
    hashed_code = hash_code(verification_code)
    email_sent = send_verification_email(email_request.email_address, verification_code)
    
    if email_sent:
        return {"message": "Verification email sent successfully", "hashed_code": hashed_code}
    else:
        raise HTTPException(status_code=500, detail="Failed to send verification email")
