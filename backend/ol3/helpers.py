import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from config import settings
import random
import string


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str):
    message = MIMEMultipart()
    message["From"] = settings.EMAIL_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))
    
    try:
        logger.info(f"Attempting to send email to {to_email}")
        logger.info(f"Using SMTP server: {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            logger.info("SMTP connection established")
            server.starttls()
            logger.info("TLS started")
            server.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
            logger.info("Logged in to SMTP server")
            server.send_message(message)
            logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise

def send_verification_email(email: str, code: str):
    subject = "Verify your email"
    body = f"Your verification code is: {code}\nThis code will expire in 5 minutes."
    send_email(email, subject, body)

def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))