from fastapi import APIRouter, Depends, HTTPException
from configurations import users_collection, drivers_collection
from deps import get_current_user
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.post("/sync")
def sync_user(user: dict = Depends(get_current_user)):
    """
    Call this once right after Firebase login/signup from the frontend.
    get_current_user already creates the user doc if it doesn't exist
    (defaults role to 'driver'). This just returns the current state.
    """
    return {
        "firebase_uid": user["firebase_uid"],
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user["role"],
        "driver_id": user.get("driver_id"),  # only set for role=driver
    }


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "firebase_uid": user["firebase_uid"],
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user["role"],
        "driver_id": user.get("driver_id"),
    }


@router.put("/set-role/{firebase_uid}")
def set_role(firebase_uid: str, role: str, admin: dict = Depends(get_current_user)):
    """
    TEMPORARY hackathon-only endpoint so you can manually promote users
    to fleet_manager / safety_officer / financial_analyst without building
    an admin UI. Call this manually via Postman for your test accounts.
    Remove or lock this down if you have time left at the end.
    """
    valid_roles = ["fleet_manager", "driver", "safety_officer", "financial_analyst"]
    if role not in valid_roles:
        raise HTTPException(400, f"role must be one of {valid_roles}")

    result = users_collection.update_one(
        {"firebase_uid": firebase_uid},
        {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
    return {"message": f"Role updated to {role}"}