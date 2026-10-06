from pydantic import BaseModel, EmailStr, constr
from datetime import datetime, date
from decimal import Decimal


class AlertResponse(BaseModel):
    alert_id: int
    boat_id: int
    alert_type: str
    message: str
    distance_from_border: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class BoatResponse(BaseModel):
    boat_id: int
    user_id: int
    boat_name: str
    registration_number: str
    boat_type: str
    capacity: int

    class Config:
        from_attributes = True        

class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    nationality: str
    state: str
    district: str
    aadhaar_number: constr(min_length=12, max_length=12, pattern=r"^\d{12}$")
    phone: constr(min_length=10, max_length=10, pattern=r"^\d{10}$")
    email: EmailStr
    password: str
    role: constr(max_length=20) = "fisherman"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserMeResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True