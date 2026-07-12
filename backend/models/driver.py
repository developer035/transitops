from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class DriverStatus(str, Enum):
    AVAILABLE = "Available"
    ON_TRIP = "On Trip"
    OFF_DUTY = "Off Duty"
    SUSPENDED = "Suspended"

class DriverModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    name: str = Field(...)
    license_number: str = Field(...)
    license_category: str = Field(...)
    license_expiry_date: str = Field(...) 
    contact_number: str = Field(...)
    safety_score: float = Field(default=100.0)
    status: DriverStatus = Field(default=DriverStatus.AVAILABLE)

    email: Optional[str] = Field(default=None)
    password: Optional[str] = Field(default=None)

    class Config:
        populate_by_name = True

class DriverUpdateModel(BaseModel):
    name: Optional[str] = None
    license_number: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry_date: Optional[str] = None
    contact_number: Optional[str] = None
    safety_score: Optional[float] = None
    status: Optional[DriverStatus] = None
