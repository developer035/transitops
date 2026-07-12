import os
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "transitops")

client = MongoClient(MONGO_URI, server_api=ServerApi('1'))
db = client[DB_NAME]

# Collections — import these anywhere you need DB access
users_collection = db["users"]
vehicles_collection = db["vehicles"]
drivers_collection = db["drivers"]
trips_collection = db["trips"]
maintenance_collection = db["maintenance_logs"]
fuel_logs_collection = db["fuel_logs"]
expenses_collection = db["expenses"]


def init_indexes():
    """Call once on startup. Enforces the spec's uniqueness rules."""
    users_collection.create_index("email", unique=True)
    vehicles_collection.create_index("registration_number", unique=True)
    drivers_collection.create_index("license_number", unique=True)
    trips_collection.create_index([("vehicle_id", 1), ("status", 1)])
    trips_collection.create_index([("driver_id", 1), ("status", 1)])
    maintenance_collection.create_index("vehicle_id")
    fuel_logs_collection.create_index("vehicle_id")
    expenses_collection.create_index("vehicle_id")


def check_connection():
    try:
        client.admin.command("ping")
        print("✅ MongoDB Atlas connected successfully")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")