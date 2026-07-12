from fastapi import APIRouter, HTTPException, status, Depends
from models.maintenance import MaintenanceModel
from configurations import maintenance_collection, vehicles_collection
from bson import ObjectId
from deps import get_current_user

router = APIRouter()

@router.get("/", response_model=list[MaintenanceModel])
def list_maintenance_logs(vehicle_id: str = None):
    query = {}
    if vehicle_id:
        query["vehicle_id"] = vehicle_id
    docs = list(maintenance_collection.find(query))
    for d in docs:
        d["_id"] = str(d["_id"])
    return docs

@router.post("/", response_model=MaintenanceModel, status_code=status.HTTP_201_CREATED)
def create_maintenance(log: MaintenanceModel, user: dict = Depends(get_current_user)):
    if user.get("role") != "fleet_manager":
        raise HTTPException(status_code=403, detail="Only Fleet Managers can create maintenance logs")
        
    log_dict = log.model_dump(by_alias=True, exclude={"id"})
    
    if not ObjectId.is_valid(log_dict["vehicle_id"]): raise HTTPException(400, "Invalid vehicle_id")
    
    vehicle = vehicles_collection.find_one({"_id": ObjectId(log_dict["vehicle_id"])})
    if not vehicle: raise HTTPException(404, "Vehicle not found")
    
    new_doc = maintenance_collection.insert_one(log_dict)
    
    # Automatically switch vehicle to In Shop
    vehicles_collection.update_one({"_id": ObjectId(log_dict["vehicle_id"])}, {"$set": {"status": "In Shop"}})
    
    created = maintenance_collection.find_one({"_id": new_doc.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.put("/{id}/close")
def close_maintenance(id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "fleet_manager":
        raise HTTPException(status_code=403, detail="Only Fleet Managers can close maintenance logs")
        
    if not ObjectId.is_valid(id): raise HTTPException(400, "Invalid ID")
    log = maintenance_collection.find_one({"_id": ObjectId(id)})
    if not log: raise HTTPException(404, "Maintenance log not found")
    if log["status"] != "Open": raise HTTPException(400, "Log is already closed")
    
    maintenance_collection.update_one({"_id": ObjectId(id)}, {"$set": {"status": "Closed"}})
    
    # Restore vehicle to Available (unless retired)
    vehicle = vehicles_collection.find_one({"_id": ObjectId(log["vehicle_id"])})
    if vehicle and vehicle.get("status") != "Retired":
        vehicles_collection.update_one({"_id": ObjectId(log["vehicle_id"])}, {"$set": {"status": "Available"}})
        
    return {"message": "Maintenance log closed successfully"}
