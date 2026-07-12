from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, FastAPI, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from pymongo.errors import DuplicateKeyError

from configurations import vehicles_collection


router = APIRouter(prefix="/vehicles", tags=["vehicles"])


class VehicleStatus(str, Enum):
    available = "Available"
    on_trip = "On Trip"
    in_shop = "In Shop"
    retired = "Retired"


class VehicleCreate(BaseModel):
    registration_number: str
    name_model: str
    type: str
    max_load_capacity: float = Field(ge=0)
    odometer: float = Field(default=0, ge=0)
    acquisition_cost: float = Field(ge=0)
    region: Optional[str] = None
    status: VehicleStatus = VehicleStatus.available


class VehicleOut(VehicleCreate):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: Optional[datetime] = None


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    name_model: Optional[str] = None
    type: Optional[str] = None
    max_load_capacity: Optional[float] = Field(default=None, ge=0)
    odometer: Optional[float] = Field(default=None, ge=0)
    acquisition_cost: Optional[float] = Field(default=None, ge=0)
    region: Optional[str] = None
    status: Optional[VehicleStatus] = None


class VehicleStatusUpdate(BaseModel):
    status: VehicleStatus


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def serialize_vehicle(vehicle: dict) -> dict:
    vehicle["_id"] = str(vehicle["_id"])
    return vehicle


def get_vehicle_or_404(vehicle_id: str) -> dict:
    if not ObjectId.is_valid(vehicle_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid vehicle id",
        )

    vehicle = vehicles_collection.find_one({"_id": ObjectId(vehicle_id)})
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )

    return vehicle


@router.post(
    "",
    response_model=VehicleOut,
    status_code=status.HTTP_201_CREATED,
)
def create_vehicle(vehicle: VehicleCreate):
    vehicle_data = vehicle.model_dump(mode="json")
    vehicle_data["created_at"] = utc_now()
    vehicle_data["updated_at"] = None

    try:
        result = vehicles_collection.insert_one(vehicle_data)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration number already exists",
        )

    created_vehicle = vehicles_collection.find_one({"_id": result.inserted_id})
    return serialize_vehicle(created_vehicle)


@router.get("", response_model=list[VehicleOut])
def list_vehicles(
    status_filter: Optional[VehicleStatus] = Query(default=None, alias="status"),
    search: Optional[str] = None,
):
    filters = {}

    if status_filter:
        filters["status"] = status_filter.value

    if search:
        filters["$or"] = [
            {"registration_number": {"$regex": search, "$options": "i"}},
            {"name_model": {"$regex": search, "$options": "i"}},
            {"type": {"$regex": search, "$options": "i"}},
        ]

    vehicles = vehicles_collection.find(filters).sort("registration_number", 1)
    return [serialize_vehicle(vehicle) for vehicle in vehicles]


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: str):
    vehicle = get_vehicle_or_404(vehicle_id)
    return serialize_vehicle(vehicle)


@router.patch("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: str, vehicle_update: VehicleUpdate):
    get_vehicle_or_404(vehicle_id)

    update_data = vehicle_update.model_dump(exclude_unset=True, mode="json")
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update",
        )

    update_data["updated_at"] = utc_now()

    try:
        vehicles_collection.update_one(
            {"_id": ObjectId(vehicle_id)},
            {"$set": update_data},
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration number already exists",
        )

    updated_vehicle = vehicles_collection.find_one({"_id": ObjectId(vehicle_id)})
    return serialize_vehicle(updated_vehicle)


@router.patch("/{vehicle_id}/status", response_model=VehicleOut)
def update_vehicle_status(vehicle_id: str, vehicle_status: VehicleStatusUpdate):
    get_vehicle_or_404(vehicle_id)

    vehicles_collection.update_one(
        {"_id": ObjectId(vehicle_id)},
        {
            "$set": {
                "status": vehicle_status.status.value,
                "updated_at": utc_now(),
            }
        },
    )

    updated_vehicle = vehicles_collection.find_one({"_id": ObjectId(vehicle_id)})
    return serialize_vehicle(updated_vehicle)


@router.post("/{vehicle_id}/retire", response_model=VehicleOut)
def retire_vehicle(vehicle_id: str):
    get_vehicle_or_404(vehicle_id)

    vehicles_collection.update_one(
        {"_id": ObjectId(vehicle_id)},
        {
            "$set": {
                "status": VehicleStatus.retired.value,
                "updated_at": utc_now(),
            }
        },
    )

    retired_vehicle = vehicles_collection.find_one({"_id": ObjectId(vehicle_id)})
    return serialize_vehicle(retired_vehicle)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(vehicle_id: str):
    get_vehicle_or_404(vehicle_id)
    vehicles_collection.delete_one({"_id": ObjectId(vehicle_id)})


app = FastAPI(title="Vehicle Registry API")
app.include_router(router)
