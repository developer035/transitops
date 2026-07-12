from fastapi import APIRouter, HTTPException, Body
from configurations import (
    vehicles_collection, drivers_collection, trips_collection,
    maintenance_collection, fuel_logs_collection, expenses_collection,
    users_collection,
)
from bson import ObjectId
from typing import List

router = APIRouter()

# ── Map of allowed collection names ──────────────────────────────────────────
COLLECTION_MAP = {
    "vehicles":         vehicles_collection,
    "drivers":          drivers_collection,
    "trips":            trips_collection,
    "maintenance_logs": maintenance_collection,
    "fuel_logs":        fuel_logs_collection,
    "expenses":         expenses_collection,
    "users":            users_collection,
}


# ── Bulk Insert ───────────────────────────────────────────────────────────────
@router.post("/bulk-populate/{collection_name}")
def bulk_populate(collection_name: str, records: List[dict] = Body(...)):
    """
    DEV ONLY — insert a JSON array into any supported collection.
    No auth required. Remove or protect before going to production.
    """
    if collection_name not in COLLECTION_MAP:
        raise HTTPException(
            400,
            f"Unknown collection '{collection_name}'. "
            f"Valid options: {list(COLLECTION_MAP.keys())}"
        )

    if not records:
        raise HTTPException(400, "records array is empty")

    collection = COLLECTION_MAP[collection_name]
    result = collection.insert_many(records)

    return {
        "collection": collection_name,
        "inserted": len(result.inserted_ids),
        "ids": [str(i) for i in result.inserted_ids],
    }


# ── List all collections overview ─────────────────────────────────────────────
@router.get("/collections")
def get_collection_counts():
    """Return document counts for all collections."""
    return {
        name: col.count_documents({})
        for name, col in COLLECTION_MAP.items()
    }


# ── User management ───────────────────────────────────────────────────────────
@router.get("/users")
def list_users():
    """List all users from MongoDB (dev tool)."""
    users = list(users_collection.find())
    for u in users:
        u["_id"] = str(u["_id"])
    return users


from firebase_admin import auth as firebase_auth

@router.post("/users")
def create_user(user: dict = Body(...)):
    """Insert a user document directly (dev tool)."""
    email = user.get("email")
    password = user.get("password")
    
    # If password is provided, try creating the user in Firebase Auth
    if email and password:
        # Check if email already registered in Firebase or local DB
        existing = users_collection.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="User with this email already exists in system")
        try:
            fb_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=user.get("name", email)
            )
            user["firebase_uid"] = fb_user.uid
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Firebase Auth creation failed: {str(e)}")
            
    # Clean up the password so it doesn't get stored in plaintext in Mongo
    user.pop("password", None)
    
    result = users_collection.insert_one(user)
    created = users_collection.find_one({"_id": result.inserted_id})
    created["_id"] = str(created["_id"])
    return created


@router.put("/users/{user_id}/firebase-uid")
def set_firebase_uid(user_id: str, firebase_uid: str = Body(..., embed=True)):
    """Set or update the firebase_uid for a user document."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(400, "Invalid user ID")
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"firebase_uid": firebase_uid}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    updated = users_collection.find_one({"_id": ObjectId(user_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.put("/users/{user_id}/role")
def set_user_role(user_id: str, role: str = Body(..., embed=True)):
    """Set or update the role for a user document."""
    valid_roles = ["fleet_manager", "driver", "safety_officer", "financial_analyst"]
    if role not in valid_roles:
        raise HTTPException(400, f"role must be one of {valid_roles}")
    if not ObjectId.is_valid(user_id):
        raise HTTPException(400, "Invalid user ID")
    result = users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": role}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    updated = users_collection.find_one({"_id": ObjectId(user_id)})
    updated["_id"] = str(updated["_id"])
    return updated


@router.delete("/users/{user_id}")
def delete_user(user_id: str):
    """Delete a user document (dev tool)."""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(400, "Invalid user ID")
    result = users_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "User not found")
    return {"message": "User deleted"}
