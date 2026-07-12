from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class VehicleStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    IN_SHOP = "In Shop"
    RETIRED = "Retired"

class VehicleModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    registration_number: str = Field(...)
    name_model: str = Field(...)
    vehicle_type: str = Field(...)
    max_load_capacity: float = Field(...)
    odometer: float = Field(default=0.0)
    acquisition_cost: float = Field(...)
    status: VehicleStatus = Field(default=VehicleStatus.AVAILABLE)

    class Config:
        populate_by_name = True

class VehicleUpdateModel(BaseModel):
    name_model: Optional[str] = None
    vehicle_type: Optional[str] = None
    max_load_capacity: Optional[float] = None
    odometer: Optional[float] = None
    acquisition_cost: Optional[float] = None
    status: Optional[VehicleStatus] = None
