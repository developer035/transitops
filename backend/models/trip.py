from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class TripStatus(str, Enum):
    DRAFT = "Draft"
    DISPATCHED = "Dispatched"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class TripModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    source: str = Field(...)
    destination: str = Field(...)
    vehicle_id: str = Field(...)
    driver_id: str = Field(...)
    cargo_weight: float = Field(...)
    planned_distance: float = Field(...)
    status: TripStatus = Field(default=TripStatus.DRAFT)

    class Config:
        populate_by_name = True
