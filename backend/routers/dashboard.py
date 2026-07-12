from fastapi import APIRouter, Depends
from configurations import vehicles_collection, trips_collection, drivers_collection
from deps import get_current_user

router = APIRouter()

@router.get("/kpis")
def get_dashboard_kpis(
    vehicle_type: str = None, 
    vehicle_status: str = None, 
    region: str = None,
    user: dict = Depends(get_current_user)
):
    # Basic filters applied to vehicles collection if needed
    vehicle_query = {}
    if vehicle_type:
        vehicle_query["vehicle_type"] = vehicle_type
    if vehicle_status:
        vehicle_query["status"] = vehicle_status
    if region:
        vehicle_query["region"] = region
        
    # Vehicle metrics
    total_vehicles = vehicles_collection.count_documents(vehicle_query)
    available_vehicles = vehicles_collection.count_documents({**vehicle_query, "status": "Available"})
    vehicles_in_maintenance = vehicles_collection.count_documents({**vehicle_query, "status": "In Shop"})
    active_vehicles = vehicles_collection.count_documents({**vehicle_query, "status": "On Trip"})
    
    # Driver metrics
    drivers_on_duty = drivers_collection.count_documents({"status": {"$in": ["Available", "On Trip"]}})
    
    # Trip metrics
    trip_query_active = {"status": "Dispatched"}
    trip_query_pending = {"status": "Draft"}
    if user.get("role") == "driver":
        driver_id = user.get("driver_id")
        trip_query_active["driver_id"] = driver_id
        trip_query_pending["driver_id"] = driver_id

    active_trips = trips_collection.count_documents(trip_query_active)
    pending_trips = trips_collection.count_documents(trip_query_pending)
    
    # Fleet Utilization
    fleet_utilization = 0
    operable_vehicles = vehicles_collection.count_documents({"status": {"$ne": "Retired"}})
    if operable_vehicles > 0:
        fleet_utilization = (active_vehicles / operable_vehicles) * 100
    
    return {
        "active_vehicles": active_vehicles,
        "available_vehicles": available_vehicles,
        "vehicles_in_maintenance": vehicles_in_maintenance,
        "active_trips": active_trips,
        "pending_trips": pending_trips,
        "drivers_on_duty": drivers_on_duty,
        "fleet_utilization_percent": round(fleet_utilization, 2)
    }
