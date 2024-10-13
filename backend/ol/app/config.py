from datetime import time
import os
from dotenv import load_dotenv

# Load env variables
load_dotenv(override=True)

# MongoDB configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

# Email server configuration (Gmail SMTP server)
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 465
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME")  # Your Gmail address
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")  # Your Gmail app password

# Scheduler configuration
SCHEDULER_TIMEZONE = "UTC"
DAILY_JOB_TIME = time(hour=0, minute=0)  # Set the time you want the job to run daily
