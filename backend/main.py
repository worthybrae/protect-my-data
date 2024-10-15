from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import os
import random
import string
import hashlib

load_dotenv()

# SendGrid setup
sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
sendgrid_from_email = os.getenv("SENDGRID_FROM_EMAIL")

app = FastAPI()

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://protect-my-data.vercel.app"],  # Allow all origins
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
async def send_email(email_request: EmailSendRequest):
    verification_code = generate_verification_code()
    hashed_code = hash_code(verification_code)
    email_sent = send_verification_email(email_request.email_address, verification_code)
    
    if email_sent:
        return {"message": "Verification email sent successfully", "hashed_code": hashed_code}
    else:
        raise HTTPException(status_code=500, detail="Failed to send verification email")