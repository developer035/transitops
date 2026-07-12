from fastapi import APIRouter, HTTPException, status, Depends
from models.trip import TripModel
from configurations import trips_collection, vehicles_collection, drivers_collection
from bson import ObjectId
from deps import get_current_user

router = APIRouter()

@router.post("/", response_model=TripModel, status_code=status.HTTP_201_CREATED)
def create_trip(trip: TripModel):
    trip_dict = trip.model_dump(by_alias=True, exclude={"id"})
    
    if not ObjectId.is_valid(trip_dict["vehicle_id"]): raise HTTPException(400, "Invalid vehicle_id")
    if not ObjectId.is_valid(trip_dict["driver_id"]): raise HTTPException(400, "Invalid driver_id")
    
    vehicle = vehicles_collection.find_one({"_id": ObjectId(trip_dict["vehicle_id"])})
    if not vehicle: raise HTTPException(404, "Vehicle not found")
    
    driver = drivers_collection.find_one({"_id": ObjectId(trip_dict["driver_id"])})
    if not driver: raise HTTPException(404, "Driver not found")
    
    if vehicle.get("status") != "Available":
        raise HTTPException(400, "Vehicle is not available")
    
    if driver.get("status") not in ["Available"]:
        raise HTTPException(400, "Driver is not available")
        
    if trip_dict["cargo_weight"] > vehicle.get("max_load_capacity", 0):
        raise HTTPException(400, f"Cargo weight exceeds vehicle capacity ({vehicle.get('max_load_capacity')})")
        
    new_doc = trips_collection.insert_one(trip_dict)
    created = trips_collection.find_one({"_id": new_doc.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.get("/", response_model=list[TripModel])
def list_trips(status: str = None, user: dict = Depends(get_current_user)):
    query = {}
    if status: query["status"] = status
    if user.get("role") == "driver":
        query["driver_id"] = user.get("driver_id")
    docs = list(trips_collection.find(query))
    for d in docs: d["_id"] = str(d["_id"])
    return docs

@router.put("/{id}/dispatch")
def dispatch_trip(id: str):
    if not ObjectId.is_valid(id): raise HTTPException(400, "Invalid ID")
    trip = trips_collection.find_one({"_id": ObjectId(id)})
    if not trip: raise HTTPException(404, "Trip not found")
    if trip["status"] != "Draft": raise HTTPException(400, "Only Draft trips can be dispatched")
    
    trips_collection.update_one({"_id": ObjectId(id)}, {"$set": {"status": "Dispatched"}})
    vehicles_collection.update_one({"_id": ObjectId(trip["vehicle_id"])}, {"$set": {"status": "On Trip"}})
    drivers_collection.update_one({"_id": ObjectId(trip["driver_id"])}, {"$set": {"status": "On Trip"}})
    
    return {"message": "Trip dispatched successfully"}

@router.put("/{id}/complete")
def complete_trip(id: str):
    if not ObjectId.is_valid(id): raise HTTPException(400, "Invalid ID")
    trip = trips_collection.find_one({"_id": ObjectId(id)})
    if not trip: raise HTTPException(404, "Trip not found")
    if trip["status"] != "Dispatched": raise HTTPException(400, "Only Dispatched trips can be completed")
    
    trips_collection.update_one({"_id": ObjectId(id)}, {"$set": {"status": "Completed"}})
    vehicles_collection.update_one({"_id": ObjectId(trip["vehicle_id"])}, {"$set": {"status": "Available"}})
    drivers_collection.update_one({"_id": ObjectId(trip["driver_id"])}, {"$set": {"status": "Available"}})
    
    return {"message": "Trip completed successfully"}

@router.put("/{id}/cancel")
def cancel_trip(id: str):
    if not ObjectId.is_valid(id): raise HTTPException(400, "Invalid ID")
    trip = trips_collection.find_one({"_id": ObjectId(id)})
    if not trip: raise HTTPException(404, "Trip not found")
    
    trips_collection.update_one({"_id": ObjectId(id)}, {"$set": {"status": "Cancelled"}})
    if trip["status"] == "Dispatched":
        vehicles_collection.update_one({"_id": ObjectId(trip["vehicle_id"])}, {"$set": {"status": "Available"}})
        drivers_collection.update_one({"_id": ObjectId(trip["driver_id"])}, {"$set": {"status": "Available"}})
        
    return {"message": "Trip cancelled successfully"}
