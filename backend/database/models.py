from typing import Optional, Annotated
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from datetime import datetime
from enum import Enum
from bson import ObjectId

PyObjectId = Annotated[str, BeforeValidator(str)]

# ---------------- ENUMS (mirror the spec exactly) ----------------
class UserRole(str, Enum):
    fleet_manager = "fleet_manager"
    driver = "driver"
    safety_officer = "safety_officer"
    financial_analyst = "financial_analyst"
    admin = "admin"

class VehicleStatus(str, Enum):
    available = "Available"
    on_trip = "On Trip"
    in_shop = "In Shop"
    retired = "Retired"

class DriverStatus(str, Enum):
    available = "Available"
    on_trip = "On Trip"
    off_duty = "Off Duty"
    suspended = "Suspended"

class TripStatus(str, Enum):
    draft = "Draft"
    dispatched = "Dispatched"
    completed = "Completed"
    cancelled = "Cancelled"

class MaintenanceStatus(str, Enum):
    active = "Active"
    closed = "Closed"

class ExpenseType(str, Enum):
    toll = "Toll"
    maintenance = "Maintenance"
    other = "Other"


# ---------------- USER ----------------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole

class UserOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})
    id: PyObjectId = Field(alias="_id")
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime


# ---------------- VEHICLE ----------------
class VehicleCreate(BaseModel):
    registration_number: str
    name_model: str
    type: str
    max_load_capacity: float
    odometer: float = 0
    acquisition_cost: float
    region: Optional[str] = None
    status: VehicleStatus = VehicleStatus.available

class VehicleOut(VehicleCreate):
    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------------- DRIVER ----------------
class DriverCreate(BaseModel):
    name: str
    license_number: str
    license_category: str
    license_expiry_date: datetime
    contact_number: str
    safety_score: float = 100
    status: DriverStatus = DriverStatus.available

class DriverOut(DriverCreate):
    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: Optional[datetime] = None


# ---------------- TRIP ----------------
class TripCreate(BaseModel):
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight: float
    planned_distance: float

class TripOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})
    id: PyObjectId = Field(alias="_id")
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight: float
    planned_distance: float
    actual_distance: Optional[float] = None
    fuel_consumed: Optional[float] = None
    status: TripStatus
    created_by: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime


# ---------------- MAINTENANCE ----------------
class MaintenanceCreate(BaseModel):
    vehicle_id: str
    type: str
    description: Optional[str] = None
    cost: float = 0

class MaintenanceOut(MaintenanceCreate):
    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})
    id: PyObjectId = Field(alias="_id")
    status: MaintenanceStatus
    started_at: datetime
    closed_at: Optional[datetime] = None


# ---------------- FUEL LOG ----------------
class FuelLogCreate(BaseModel):
    vehicle_id: str
    trip_id: Optional[str] = None
    liters: float
    cost: float
    date: datetime

class FuelLogOut(FuelLogCreate):
    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})
    id: PyObjectId = Field(alias="_id")
    created_at: datetime


# ---------------- EXPENSE ----------------
class ExpenseCreate(BaseModel):
    vehicle_id: Optional[str] = None
    trip_id: Optional[str] = None
    type: ExpenseType
    amount: float
    date: datetime
    description: Optional[str] = None

class ExpenseOut(ExpenseCreate):
    model_config = ConfigDict(populate_by_name=True, json_encoders={ObjectId: str})
    id: PyObjectId = Field(alias="_id")
    created_at: datetime