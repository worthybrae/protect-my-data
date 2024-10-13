from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from ..utils.formatting import generate_uuid

class UserCreate(BaseModel):
    email: EmailStr
    advertising_id: Optional[str] = None

class User(UserCreate):
    user_id: str = Field(default_factory=generate_uuid)
    _id: Optional[str] = None  # Keep this for MongoDB's internal use
    email_verified: bool = False
    email_verification_code: Optional[str] = None
    email_verification_code_expires_at: Optional[datetime] = None
    status: str = "created"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    email_updated_at: Optional[datetime] = None
    advertising_id_updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

def is_valid_advertising_id(ad_id: Optional[str]) -> bool:
    return ad_id is not None and ad_id.strip() != "" and not all(c == '0' for c in ad_id if c.isdigit())

def should_be_active(user: 'User') -> bool:
    return user.email_verified or is_valid_advertising_id(user.advertising_id)
