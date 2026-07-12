from fastapi import APIRouter, HTTPException, status
from models.driver import DriverModel, DriverUpdateModel
from configurations import drivers_collection
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=DriverModel, status_code=status.HTTP_201_CREATED)
def create_driver(driver: DriverModel):
    driver_dict = driver.model_dump(by_alias=True, exclude={"id"})
    
    # Check if license number already exists
    existing_driver = drivers_collection.find_one({"license_number": driver_dict["license_number"]})
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver with this license number already exists")
    
    new_driver = drivers_collection.insert_one(driver_dict)
    created_driver = drivers_collection.find_one({"_id": new_driver.inserted_id})
    created_driver["_id"] = str(created_driver["_id"])
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
