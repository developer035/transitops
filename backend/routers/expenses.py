from fastapi import APIRouter, HTTPException, status
from models.expense import FuelLogModel, ExpenseModel
from configurations import fuel_logs_collection, expenses_collection
from bson import ObjectId

router = APIRouter()

@router.post("/fuel", response_model=FuelLogModel, status_code=status.HTTP_201_CREATED)
def record_fuel(log: FuelLogModel):
    log_dict = log.model_dump(by_alias=True, exclude={"id"})
    if not ObjectId.is_valid(log_dict["vehicle_id"]): raise HTTPException(400, "Invalid vehicle_id")
    new_doc = fuel_logs_collection.insert_one(log_dict)
    created = fuel_logs_collection.find_one({"_id": new_doc.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.post("/other", response_model=ExpenseModel, status_code=status.HTTP_201_CREATED)
def record_expense(expense: ExpenseModel):
    exp_dict = expense.model_dump(by_alias=True, exclude={"id"})
    if not ObjectId.is_valid(exp_dict["vehicle_id"]): raise HTTPException(400, "Invalid vehicle_id")
    new_doc = expenses_collection.insert_one(exp_dict)
    created = expenses_collection.find_one({"_id": new_doc.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.get("/vehicle/{vehicle_id}/cost")
def get_operational_cost(vehicle_id: str):
    if not ObjectId.is_valid(vehicle_id): raise HTTPException(400, "Invalid vehicle_id")
    
    fuel_total = sum(log["cost"] for log in fuel_logs_collection.find({"vehicle_id": vehicle_id}))
    expenses_total = sum(exp["cost"] for exp in expenses_collection.find({"vehicle_id": vehicle_id}))
    
    return {
        "vehicle_id": vehicle_id,
        "total_fuel_cost": fuel_total,
        "total_other_expenses": expenses_total,
        "total_operational_cost": fuel_total + expenses_total
    }
