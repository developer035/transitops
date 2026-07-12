from pydantic import BaseModel, Field
from typing import Optional

class FuelLogModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    vehicle_id: str = Field(...)
    liters: float = Field(...)
    cost: float = Field(...)
    date: str = Field(...)
    
    class Config: populate_by_name = True

class ExpenseModel(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    vehicle_id: str = Field(...)
    expense_type: str = Field(...)
    cost: float = Field(...)
    date: str = Field(...)

    class Config: populate_by_name = True
