from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class MaintenanceStatus(str, Enum):
    OPEN = "Open"
    CLOSED = "Closed"

class MaintenanceModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    vehicle_id: str = Field(...)
    description: str = Field(...)
    cost: float = Field(...)
    date: str = Field(...)
    status: MaintenanceStatus = Field(default=MaintenanceStatus.OPEN)

    class Config:
        populate_by_name = True
