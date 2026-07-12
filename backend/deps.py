from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth
from configurations import users_collection

def get_current_user(authorization: str = Header(...)):
    """
    Expects header: Authorization: Bearer <firebase_id_token>
    Verifies token, looks up (or lazily creates) the user's role record in Mongo.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ")[1]

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

    uid = decoded["uid"]
    user = users_collection.find_one({"firebase_uid": uid})
    if not user:
        email = decoded.get("email")
        if email:
            # Check if a pre-populated user exists with this email
            user = users_collection.find_one({"email": email})
            if user:
                users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"firebase_uid": uid}}
                )
                user["firebase_uid"] = uid
        
        if not user:
            user = {
                "firebase_uid": uid,
                "email": email,
                "name": decoded.get("name", email),
                "role": "driver",
            }
            result = users_collection.insert_one(user)
            user["_id"] = result.inserted_id

    return user


def require_role(*allowed_roles):
    def checker(user: dict = Header(default=None)):
        pass
    return checker