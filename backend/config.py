import os
from dotenv import load_dotenv

load_dotenv(override=True)

def load_config():
    return {
        "MONGO_DETAILS": os.getenv("MONGODB_URI"),
        "SECRET_KEY": os.getenv("SECRET_KEY"),
        "EMAIL_HOST": os.getenv("EMAIL_HOST", "smtp.gmail.com"),
        "EMAIL_PORT": int(os.getenv("EMAIL_PORT", "587")),
        "EMAIL_USERNAME": os.getenv("EMAIL_USERNAME"),
        "EMAIL_PASSWORD": os.getenv("EMAIL_PASSWORD"),
        "EMAIL_FROM": os.getenv("EMAIL_FROM"),
        "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY"),
        "JWT_ALGORITHM": os.getenv("JWT_ALGORITHM", "HS256"),
        "ACCESS_TOKEN_EXPIRE_MINUTES": int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")),
    }