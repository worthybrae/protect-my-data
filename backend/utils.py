import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import load_config
import random
import string
from datetime import datetime, timedelta
from jose import jwt
from logger import logger

config = load_config()

def send_email(to_email: str, subject: str, body: str):
    message = MIMEMultipart()
    message["From"] = config["EMAIL_FROM"]
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))
    
    try:
        with smtplib.SMTP(config["EMAIL_HOST"], config["EMAIL_PORT"]) as server:
            server.starttls()
            server.login(config["EMAIL_USERNAME"], config["EMAIL_PASSWORD"])
            server.send_message(message)
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise

def send_verification_email(email: str, code: str):
    subject = "Verify your email"
    body = f"Your verification code is: {code}\nThis code will expire in 5 minutes."
    send_email(email, subject, body)

def send_password_reset_email(email: str, reset_code: str):
    subject = "Reset your password"
    body = f"Your password reset code is: {reset_code}\nThis code will expire in 15 minutes."
    send_email(email, subject, body)

def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config["JWT_SECRET_KEY"], algorithm=config["JWT_ALGORITHM"])
    return encoded_jwt
