import aiosmtplib
from email.message import EmailMessage
from ..config import EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME, EMAIL_PASSWORD
import logging

logger = logging.getLogger(__name__)

async def send_email(from_email, to_email, subject, body):
    """
    Sends an email using Gmail SMTP server.
    """
    msg = EmailMessage()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=EMAIL_HOST,
            port=EMAIL_PORT,
            username=EMAIL_USERNAME,
            password=EMAIL_PASSWORD,
            use_tls=True
        )
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise

async def send_verification_email(to_email, verification_code):
    """
    Sends a verification email with the provided code.
    """
    subject = "Email Verification"
    body = f"""
    Thank you for registering with our service!
    
    Your verification code is: {verification_code}
    
    This code will expire in 24 hours. Please use it to verify your email address.
    
    If you didn't request this verification, please ignore this email.
    """
    await send_email(EMAIL_USERNAME, to_email, subject, body)