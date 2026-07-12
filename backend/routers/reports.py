from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from configurations import vehicles_collection, fuel_logs_collection, expenses_collection
import io
import csv

router = APIRouter()

@router.get("/export")
def export_vehicles_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Registration Number", "Name/Model", "Type", "Status", 
        "Odometer", "Acquisition Cost", "Total Fuel Cost", 
        "Total Maintenance/Other Cost", "Total Operational Cost",
        "Fuel Efficiency (km/L)", "Vehicle ROI"
    ])
    
    vehicles = list(vehicles_collection.find())
    for v in vehicles:
        vid = str(v["_id"])
        fuel_logs = list(fuel_logs_collection.find({"vehicle_id": vid}))
        fuel_cost = sum(log["cost"] for log in fuel_logs)
        total_liters = sum(log.get("liters", 0) for log in fuel_logs)
        
        other_cost = sum(exp["cost"] for exp in expenses_collection.find({"vehicle_id": vid}))
        total_ops_cost = fuel_cost + other_cost
        
        revenue = 0  # To be implemented/tracked later
        acq_cost = v.get("acquisition_cost", 1)
        if acq_cost == 0: acq_cost = 1
        
        roi = (revenue - total_ops_cost) / acq_cost
        
        odometer = v.get("odometer", 0)
        fuel_eff = (odometer / total_liters) if total_liters > 0 else 0
        
        writer.writerow([
            v.get("registration_number"),
            v.get("name_model"),
            v.get("vehicle_type"),
            v.get("status"),
            odometer,
            v.get("acquisition_cost"),
            fuel_cost,
            other_cost,
            total_ops_cost,
            f"{fuel_eff:.2f}",
            f"{roi:.4f}"
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=fleet_report.csv"}
    )
