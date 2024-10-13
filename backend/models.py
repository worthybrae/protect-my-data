from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
import re
from typing import Optional
from bson import ObjectId


class TimestampModel(BaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserInDB(TimestampModel):
    id: str = Field(alias="_id")
    email: EmailStr
    hashed_password: str
    is_verified: bool = False

    class Config:
        populate_by_name = True

class User(BaseModel):
    id: str
    email: EmailStr
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {
            ObjectId: str
        }

class Token(BaseModel):
    access_token: str
    token_type: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)

    @field_validator('password')
    @classmethod
    def password_complexity(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$', v):
            raise ValueError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        return v

class EmailRecord(TimestampModel):
    id: str = Field(alias="_id")
    user_id: str
    email: EmailStr
    is_verified: bool = False
    status: str = "created"

    @field_validator('status')
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        if v not in ["created", "active", "disabled"]:
            raise ValueError('Status must be either "created", "active", or "disabled"')
        return v

class DeviceRecord(TimestampModel):
    id: str = Field(alias="_id")
    user_id: str
    advertising_id: str
    status: str = "active"

    @field_validator('advertising_id')
    @classmethod
    def validate_advertising_id(cls, v: str) -> str:
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', v.lower()):
            raise ValueError('Invalid advertising ID format')
        return v

    @field_validator('status')
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        if v not in ["active", "disabled"]:
            raise ValueError('Status must be either "active" or "disabled"')
        return v

class EmailAdd(BaseModel):
    email: EmailStr

class AdvertisingIdAdd(BaseModel):
    advertising_id: str

    @field_validator('advertising_id')
    @classmethod
    def validate_advertising_id(cls, v: str) -> str:
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', v.lower()):
            raise ValueError('Invalid advertising ID format')
        return v
    
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    advertising_id: Optional[str] = Field(None)

    @field_validator('password')
    @classmethod
    def password_complexity(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$', v):
            raise ValueError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
        return v

    @field_validator('advertising_id')
    @classmethod
    def validate_advertising_id(cls, v):
        if v is not None and not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', v.lower()):
            raise ValueError('Invalid advertising ID format')
        return v
    
class LoginInput(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailInput(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)

    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        if not v.isdigit():
            raise ValueError('Verification code must contain only digits')
        return v
    
class ResendVerificationInput(BaseModel):
    email: EmailStr
