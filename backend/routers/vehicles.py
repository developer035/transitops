from fastapi import APIRouter, HTTPException, status
from models.vehicle import VehicleModel, VehicleUpdateModel
from configurations import vehicles_collection
from bson import ObjectId

router = APIRouter()

@router.post("/", response_model=VehicleModel, status_code=status.HTTP_201_CREATED)
def create_vehicle(vehicle: VehicleModel):
    vehicle_dict = vehicle.model_dump(by_alias=True, exclude={"id"})
    
    existing = vehicles_collection.find_one({"registration_number": vehicle_dict["registration_number"]})
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle with this registration number already exists")
    
    new_doc = vehicles_collection.insert_one(vehicle_dict)
    created = vehicles_collection.find_one({"_id": new_doc.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.get("/", response_model=list[VehicleModel])
def list_vehicles(status: str = None, type: str = None):
    query = {}
    if status: query["status"] = status
    if type: query["vehicle_type"] = type
    docs = list(vehicles_collection.find(query))
    for d in docs: d["_id"] = str(d["_id"])
    return docs

@router.get("/{id}", response_model=VehicleModel)
def get_vehicle(id: str):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    doc = vehicles_collection.find_one({"_id": ObjectId(id)})
    if not doc: raise HTTPException(status_code=404, detail="Vehicle not found")
    doc["_id"] = str(doc["_id"])
    return doc

@router.put("/{id}", response_model=VehicleModel)
def update_vehicle(id: str, update_data: VehicleUpdateModel):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    data = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not data: raise HTTPException(status_code=400, detail="No fields to update")

    res = vehicles_collection.update_one({"_id": ObjectId(id)}, {"$set": data})
    if res.matched_count == 0: raise HTTPException(status_code=404, detail="Vehicle not found")
        
    doc = vehicles_collection.find_one({"_id": ObjectId(id)})
    doc["_id"] = str(doc["_id"])
    return doc
