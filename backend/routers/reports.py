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
        "Total Maintenance/Other Cost", "Total Operational Cost", "Vehicle ROI"
    ])
    
    vehicles = list(vehicles_collection.find())
    for v in vehicles:
        vid = str(v["_id"])
        fuel_cost = sum(log["cost"] for log in fuel_logs_collection.find({"vehicle_id": vid}))
        other_cost = sum(exp["cost"] for exp in expenses_collection.find({"vehicle_id": vid}))
        total_ops_cost = fuel_cost + other_cost
        
        revenue = 0  # To be implemented/tracked later
        acq_cost = v.get("acquisition_cost", 1)
        if acq_cost == 0: acq_cost = 1
        
        roi = (revenue - total_ops_cost) / acq_cost
        
        writer.writerow([
            v.get("registration_number"),
            v.get("name_model"),
            v.get("vehicle_type"),
            v.get("status"),
            v.get("odometer"),
            v.get("acquisition_cost"),
            fuel_cost,
            other_cost,
            total_ops_cost,
            f"{roi:.4f}"
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=fleet_report.csv"}
    )
