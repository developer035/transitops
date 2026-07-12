from fastapi import APIRouter, HTTPException, status
from models.driver import DriverModel, DriverUpdateModel
from firebase_admin import auth as firebase_auth
from configurations import drivers_collection, users_collection
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=DriverModel, status_code=status.HTTP_201_CREATED)
def create_driver(driver: DriverModel):
    driver_dict = driver.model_dump(by_alias=True, exclude={"id", "email", "password"})
    
    # Check if license number already exists
    existing_driver = drivers_collection.find_one({"license_number": driver_dict["license_number"]})
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver with this license number already exists")
    
    # Check email and password for Firebase Auth account creation
    firebase_uid = None
    email = driver.email
    password = driver.password
    
    if email and password:
        # Check if email is already taken in users collection
        existing_user = users_collection.find_one({"email": email})
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists in system")
        
        try:
            # Create user in Firebase Auth
            fb_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=driver.name
            )
            firebase_uid = fb_user.uid
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Firebase Auth creation failed: {str(e)}")

    new_driver = drivers_collection.insert_one(driver_dict)
    driver_id = str(new_driver.inserted_id)
    
    # Create the corresponding user record if Firebase Auth user was created
    if firebase_uid:
        user_doc = {
            "firebase_uid": firebase_uid,
            "email": email,
            "name": driver.name,
            "role": "driver",
            "driver_id": driver_id
        }
        users_collection.insert_one(user_doc)
        
    created_driver = drivers_collection.find_one({"_id": ObjectId(driver_id)})
    created_driver["_id"] = driver_id
    # Add back the email field to response model if needed, or leave None
    created_driver["email"] = email
    return created_driver

@router.get("/", response_model=list[DriverModel])
def list_drivers(status: str = None):
    query = {}
    if status:
        query["status"] = status
    drivers = list(drivers_collection.find(query))
    for d in drivers:
        d["_id"] = str(d["_id"])
    return drivers

@router.get("/{id}", response_model=DriverModel)
def get_driver(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Driver ID")
    driver = drivers_collection.find_one({"_id": ObjectId(id)})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver["_id"] = str(driver["_id"])
    return driver

@router.put("/{id}", response_model=DriverModel)
def update_driver(id: str, driver_update: DriverUpdateModel):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Driver ID")
    
    update_data = {k: v for k, v in driver_update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = drivers_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
        
    updated_driver = drivers_collection.find_one({"_id": ObjectId(id)})
    updated_driver["_id"] = str(updated_driver["_id"])
    return updated_driver

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Driver ID")
    
    result = drivers_collection.delete_one({"_id": ObjectId(id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return None
