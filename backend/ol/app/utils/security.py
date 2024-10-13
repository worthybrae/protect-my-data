import re
import random
import string
from datetime import datetime
from passlib.hash import bcrypt

def generate_verification_code(length=6):
    """
    Generates a random verification code of specified length.
    """
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def hash_verification_code(code: str) -> str:
    """
    Hashes the verification code for secure storage.
    """
    return bcrypt.hash(code)

def verify_verification_code(plain_code: str, hashed_code: str) -> bool:
    """
    Verifies the provided verification code against the stored hash.
    """
    return bcrypt.verify(plain_code, hashed_code)

def is_verification_code_expired(expiration_time: datetime) -> bool:
    """
    Checks if the verification code has expired.
    """
    return datetime.utcnow() > expiration_time

def validate_advertising_id(ad_id):
    """
    Validates the format of the advertising ID.
    """
    # UUID format (for iOS)
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    
    # Android advertising ID format (16 hexadecimal characters)
    android_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    
    if re.match(uuid_pattern, ad_id, re.IGNORECASE) or re.match(android_pattern, ad_id, re.IGNORECASE):
        return True
    return False