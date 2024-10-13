from fastapi import HTTPException, BackgroundTasks, Depends
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from passlib.context import CryptContext
from typing import Optional
from pydantic import EmailStr
from jose import JWTError, jwt
from database import (
    get_user, create_user, update_user, store_verification_code, 
    get_verification_code, delete_verification_code, get_user_by_id,
    add_email, verify_email as verify_email_db, add_device
)
from utils import (
    generate_verification_code, send_verification_email, 
    send_password_reset_email, create_access_token
)
from models import UserUpdate, EmailAdd, AdvertisingIdAdd, User
from config import load_config
from logger import logger

config = load_config()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, config["JWT_SECRET_KEY"], algorithms=[config["JWT_ALGORITHM"]])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_dict = await get_user_by_id(user_id)
    if user_dict is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_dict)

async def send_and_store_verification(email: EmailStr, user_id: str, background_tasks: BackgroundTasks):
    existing_code = await get_verification_code(email)
    if existing_code and (datetime.utcnow() - existing_code['created_at']) < timedelta(minutes=1):
        raise HTTPException(status_code=429, detail="Please wait for 1 minute before requesting a new code")

    verification_code = generate_verification_code()
    hashed_code = get_password_hash(verification_code)
    expiration_time = datetime.utcnow() + timedelta(minutes=5)
    await store_verification_code(email, hashed_code, expiration_time, user_id)
    background_tasks.add_task(send_verification_email, email, verification_code)

async def register_user(
    email: str,
    password: str,
    advertising_id: Optional[str],
    background_tasks: BackgroundTasks
):
    existing_user = await get_user(email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(password)
    new_user = {
        "email": email,
        "hashed_password": hashed_password,
        "is_verified": False
    }
    user_id = await create_user(new_user)
    
    await add_email(str(user_id), email)
    if advertising_id and advertising_id != "00000000-0000-0000-0000-000000000000":
        await add_device(str(user_id), advertising_id)
    await send_and_store_verification(email, str(user_id), background_tasks)
    
    logger.info(f"New user registered: {email}")
    return {"message": "User created successfully. Please check your email for the verification code.", "user_id": str(user_id)}

async def verify_email(email: EmailStr, code: str):
    verification = await get_verification_code(email)
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if not verify_password(code, verification["hashed_code"]):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if verification["expiration_time"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    await verify_email_db(str(verification["user_id"]), email)
    await delete_verification_code(email)
    logger.info(f"Email verified: {email}")
    return {"message": "Email verified successfully"}

async def resend_verification(email: EmailStr, background_tasks: BackgroundTasks):
    user = await get_user(email)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    await send_and_store_verification(email, str(user["_id"]), background_tasks)
    logger.info(f"Verification email resent: {email}")
    return {"message": "Verification email sent"}

async def login_user(email: str, password: str):
    user = await get_user(email)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not verify_password(password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    if not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your email to log in.")
    
    access_token_expires = timedelta(minutes=config["ACCESS_TOKEN_EXPIRE_MINUTES"])
    access_token = create_access_token(
        data={"sub": str(user["_id"])}, expires_delta=access_token_expires
    )
    logger.info(f"User logged in: {email}")
    return {"access_token": access_token, "token_type": "bearer"}

async def update_user_data(user_id: str, user_update: UserUpdate):
    update_data = user_update.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    await update_user(user_id, update_data)
    logger.info(f"User data updated: {user_id}")
    return {"message": "User data updated successfully"}

async def add_email_to_user(user_id: str, email_add: EmailAdd, background_tasks: BackgroundTasks):
    await add_email(user_id, email_add.email)
    await send_and_store_verification(email_add.email, user_id, background_tasks)
    logger.info(f"Email added for user: {user_id}")
    return {"message": "Email added successfully. Please check your email for the verification code."}

async def add_advertising_id_to_user(user_id: str, ad_id_add: AdvertisingIdAdd):
    await add_device(user_id, ad_id_add.advertising_id)
    logger.info(f"Advertising ID added for user: {user_id}")
    return {"message": "Advertising ID added successfully"}

async def forgot_password(email: EmailStr, background_tasks: BackgroundTasks):
    user = await get_user(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    reset_code = generate_verification_code()
    hashed_reset_code = get_password_hash(reset_code)
    expiration_time = datetime.utcnow() + timedelta(minutes=15)
    await store_verification_code(email, hashed_reset_code, expiration_time, str(user["_id"]))
    background_tasks.add_task(send_password_reset_email, email, reset_code)
    logger.info(f"Password reset requested for: {email}")
    return {"message": "Password reset email sent"}

async def reset_password(email: EmailStr, reset_code: str, new_password: str):
    verification = await get_verification_code(email)
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    if not verify_password(reset_code, verification["hashed_code"]):
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    if verification["expiration_time"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset code has expired")
    
    hashed_password = get_password_hash(new_password)
    await update_user(str(verification["user_id"]), {"hashed_password": hashed_password})
    await delete_verification_code(email)
    logger.info(f"Password reset successful for: {email}")
    return {"message": "Password reset successfully"}