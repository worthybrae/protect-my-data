from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .email_service import send_email
from ..database import get_database
from ..config import DAILY_JOB_TIME, SCHEDULER_TIMEZONE
import asyncio

def start_scheduler():
    """
    Initializes and starts the APScheduler.
    """
    scheduler = AsyncIOScheduler(timezone=SCHEDULER_TIMEZONE)
    scheduler.add_job(
        daily_email_job,
        trigger='cron',
        hour=DAILY_JOB_TIME.hour,
        minute=DAILY_JOB_TIME.minute
    )
    scheduler.start()

async def daily_email_job():
    """
    Job that runs daily to send emails from each active user.
    """
    db = get_database()
    users_collection = db['users']
    active_users_cursor = users_collection.find({"status": "active"})
    active_users = await active_users_cursor.to_list(length=None)
    
    tasks = []
    for user in active_users:
        from_email = user['email']
        to_email_list = get_email_list()
        subject = "Daily Update"
        body = generate_email_body(user)
        
        for to_email in to_email_list:
            tasks.append(
                send_email(from_email, to_email, subject, body)
            )
    # Run all email tasks concurrently
    await asyncio.gather(*tasks)

def generate_email_body(user):
    """
    Generates the email content based on the user.
    """
    return f"Hello, this is an email from {user['email']}."

def get_email_list():
    """
    Retrieves the list of email addresses to send emails to.
    """
    # This should be replaced with the actual logic to get the email list
    return ["recipient1@example.com", "recipient2@example.com"]
