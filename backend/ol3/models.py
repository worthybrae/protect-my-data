from pydantic import BaseModel, EmailStr, validator
import re

class EmailCreate(BaseModel):
    email_address: EmailStr

class EmailVerify(BaseModel):
    email_id: str
    verification_code: str

class DeviceCreate(BaseModel):
    advertising_id: str

    @validator('advertising_id')
    def validate_advertising_id(cls, v):
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', v, re.I):
            raise ValueError('Invalid advertising ID format')
        return v