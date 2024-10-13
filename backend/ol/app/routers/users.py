from fastapi import APIRouter, HTTPException, status, Body
from ..models.user import User, UserCreate, is_valid_advertising_id, should_be_active
from ..database import get_database
from ..utils.formatting import generate_uuid
from ..utils.security import (
    generate_verification_code,
    hash_verification_code,
    verify_verification_code,
    is_verification_code_expired,
    validate_advertising_id
)
from typing import List
from pydantic import EmailStr
from ..utils.email_service import send_verification_email
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.post("/", response_model=User)
async def create_user(user: UserCreate):
    """
    Creates a new user in the database.
    """
    db = get_database()
    users_collection = db['users']

    # Check if user already exists
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Validate advertising ID
    is_valid_ad_id = False
    if user.advertising_id:
        if not validate_advertising_id(user.advertising_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid advertising ID format")
        is_valid_ad_id = not all(c == '0' for c in user.advertising_id if c.isdigit())

    now = datetime.utcnow()
    new_user = User(
        **user.dict(),
        user_id=generate_uuid(),
        email_verification_code=None,
        email_verification_code_expires_at=None,
        status="active" if is_valid_ad_id else "created",
        created_at=now,
        updated_at=now,
        email_updated_at=now,
        advertising_id_updated_at=now if user.advertising_id else None
    )

    result = await users_collection.insert_one(new_user.dict(by_alias=True))
    new_user._id = str(result.inserted_id)
    return new_user

@router.post("/verify-email")
async def verify_email_endpoint(email: str = Body(...), verification_code: str = Body(...)):
    """
    Verifies the email address using the provided email and verification code.
    """
    db = get_database()
    users_collection = db['users']

    user = await users_collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    if is_verification_code_expired(user.get("email_verification_code_expires_at")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code has expired")

    stored_hashed_code = user.get("email_verification_code")
    if not verify_verification_code(verification_code, stored_hashed_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code")

    now = datetime.utcnow()
    update_data = {
        "email_verified": True,
        "email_verification_code": None,
        "email_verification_code_expires_at": None,
        "updated_at": now,
        "status": "active"
    }

    result = await users_collection.update_one(
        {"email": email},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user's email verification status")

    return {"message": "Email verified successfully"}

@router.put("/{user_id}/advertising-id")
async def update_advertising_id(user_id: str, advertising_id: str = Body(...)):
    """
    Updates the user's advertising ID.
    """
    if not validate_advertising_id(advertising_id):
        raise HTTPException(status_code=400, detail="Invalid advertising ID format")

    db = get_database()
    users_collection = db['users']

    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.utcnow()
    update_data = {
        "advertising_id": advertising_id,
        "updated_at": now,
        "advertising_id_updated_at": now
    }

    # Update status to active if the new advertising ID is valid
    if is_valid_advertising_id(advertising_id):
        update_data["status"] = "active"

    result = await users_collection.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Advertising ID updated successfully"}

@router.post("/send-verification-email")
async def send_verification_email_endpoint(user_id: str):
    """
    Sends a verification email to the user identified by user_id.
    """
    db = get_database()
    users_collection = db['users']

    user = await users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.get("email_verified", False):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    verification_code = generate_verification_code()  # This should generate a 6-character code
    hashed_code = hash_verification_code(verification_code)
    expiration_time = datetime.utcnow() + timedelta(hours=24)

    await users_collection.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "email_verification_code": hashed_code,
                "email_verification_code_expires_at": expiration_time,
                "updated_at": datetime.utcnow()
            }
        }
    )

    await send_verification_email(user['email'], verification_code)

    return {"message": "Verification email sent"}

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: str):
    """
    Retrieves a user's information.
    """
    db = get_database()
    users_collection = db['users']
    user = await users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}/status", response_model=User)
async def update_user_status(user_id: str, status: str):
    """
    Updates the user's status.
    """
    if status not in ["active", "disabled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db = get_database()
    users_collection = db['users']
    result = await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await users_collection.find_one({"_id": user_id})
    return user
