from fastapi import APIRouter
from configurations import vehicles_collection, trips_collection, drivers_collection

router = APIRouter()

@router.get("/kpis")
def get_dashboard_kpis(vehicle_type: str = None, vehicle_status: str = None, region: str = None):
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
    active_trips = trips_collection.count_documents({"status": "Dispatched"})
    pending_trips = trips_collection.count_documents({"status": "Draft"})
    
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
