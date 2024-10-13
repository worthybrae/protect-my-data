from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from config import load_config
from bson import ObjectId
from datetime import datetime

config = load_config()
client = AsyncIOMotorClient(config["MONGO_DETAILS"], serverSelectionTimeoutMS=5000)
database = client.users_db
user_collection = database.get_collection("users")
email_collection = database.get_collection("emails")
device_collection = database.get_collection("devices")
verification_collection = database.get_collection("verification_codes")

async def get_user(email: str):
    return await user_collection.find_one({"email": email})

async def get_user_by_id(user_id: str):
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if user:
        user['id'] = str(user['_id'])
        del user['_id']
    return user

async def create_user(user_data: dict):
    user_data["created_at"] = user_data["updated_at"] = datetime.utcnow()
    result = await user_collection.insert_one(user_data)
    return result.inserted_id

async def update_user(user_id: str, update_data: dict):
    update_data["updated_at"] = datetime.utcnow()
    return await user_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

async def add_email(user_id: str, email: str, is_verified: bool = False):
    now = datetime.utcnow()
    return await email_collection.insert_one({
        "user_id": ObjectId(user_id),
        "email": email,
        "is_verified": is_verified,
        "status": "created",
        "created_at": now,
        "updated_at": now
    })

async def get_user_emails(user_id: str):
    cursor = email_collection.find({"user_id": ObjectId(user_id)})
    return await cursor.to_list(length=None)

async def verify_email(user_id: str, email: str):
    # Update the email record
    await email_collection.update_one(
        {"user_id": ObjectId(user_id), "email": email},
        {"$set": {"is_verified": True, "status": "active", "updated_at": datetime.utcnow()}}
    )
    
    # Update the user's verification status if not already verified
    await user_collection.update_one(
        {"_id": ObjectId(user_id), "is_verified": False},
        {"$set": {"is_verified": True, "updated_at": datetime.utcnow()}}
    )

async def add_device(user_id: str, advertising_id: str):
    if advertising_id == "00000000-0000-0000-0000-000000000000":
        return None  # Don't add the device if it's all zeros
    
    now = datetime.utcnow()
    return await device_collection.insert_one({
        "user_id": ObjectId(user_id),
        "advertising_id": advertising_id,
        "status": "active",
        "created_at": now,
        "updated_at": now
    })

async def get_user_devices(user_id: str):
    cursor = device_collection.find({"user_id": ObjectId(user_id)})
    return await cursor.to_list(length=None)

async def store_verification_code(email: str, hashed_code: str, expiration_time, user_id: str):
    now = datetime.utcnow()
    await verification_collection.update_one(
        {"email": email},
        {"$set": {
            "hashed_code": hashed_code, 
            "expiration_time": expiration_time,
            "user_id": ObjectId(user_id),
            "created_at": now,
            "updated_at": now
        }},
        upsert=True
    )

async def get_verification_code(email: str):
    return await verification_collection.find_one({"email": email})

async def delete_verification_code(email: str):
    await verification_collection.delete_one({"email": email})

async def update_device_status(user_id: str, advertising_id: str, status: str):
    result = await device_collection.update_one(
        {"user_id": ObjectId(user_id), "advertising_id": advertising_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    return result.modified_count > 0

async def update_email_status(user_id: str, email: str, status: str):
    result = await email_collection.update_one(
        {"user_id": ObjectId(user_id), "email": email},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    return result.modified_count > 0

async def get_user_emails_and_devices(user_id: str):
    emails = await get_user_emails(user_id)
    devices = await get_user_devices(user_id)
    
    # Convert ObjectId to string for each email and device
    for email in emails:
        email['id'] = str(email['_id'])
        del email['_id']
        email['user_id'] = str(email['user_id'])
    
    for device in devices:
        device['id'] = str(device['_id'])
        del device['_id']
        device['user_id'] = str(device['user_id'])
    
    return {"emails": emails, "devices": devices}

async def startup_db_client():
    try:
        await client.server_info()
    except ServerSelectionTimeoutError:
        print("Unable to connect to the database. Please check your MongoDB connection.")

async def shutdown_db_client():
    client.close()