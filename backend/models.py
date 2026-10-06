from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Date
from database import Base


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, index=True)
    boat_id = Column(Integer)
    alert_type = Column(String(30))
    message = Column(Text)
    distance_from_border = Column(Numeric(6, 2))
    created_at = Column(DateTime)


class Boat(Base):
    __tablename__ = "boats"

    boat_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    boat_name = Column(String(100))
    registration_number = Column(String(30))
    boat_type = Column(String(50))
    capacity = Column(Integer)

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)

    first_name = Column(String(50))
    last_name = Column(String(50))
    date_of_birth = Column(Date)
    nationality = Column(String(30))
    state = Column(String(50))
    district = Column(String(50))

    aadhaar_number = Column(String(12))
    phone = Column(String(10))
    email = Column(String(100))
    password = Column(String(255))
    role = Column(String(20))