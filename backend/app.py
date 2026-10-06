import os
import math
import random
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from typing import Optional
from database import get_db, Base, engine, SessionLocal
from models import Alert, Boat as BoatModel, User
from schemas import (
    AlertResponse,
    BoatResponse,
    SignupRequest,
    LoginRequest,
    UserMeResponse,
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)

from pydantic import BaseModel


app = FastAPI(
    title="OceanMind Backend API",
    description="Smart Maritime Border Alert System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_demo_boats():
    db = SessionLocal()
    try:
        if db.query(BoatModel).count() == 0:
            demo_boats = [
                BoatModel(user_id=1, boat_name="Ocean Sentinel IX", registration_number="IND-TN-10-MM-884", boat_type="Deep Sea Trawler", capacity=12),
                BoatModel(user_id=1, boat_name="Kadal Kani II", registration_number="IND-TN-01-CP-102", boat_type="Motorized Gillnetter", capacity=8),
                BoatModel(user_id=1, boat_name="Pearl Fisher V", registration_number="IND-TN-06-TT-505", boat_type="Mechanized Trawler", capacity=15),
                BoatModel(user_id=1, boat_name="Velankanni Star", registration_number="IND-TN-08-NG-304", boat_type="Catamaran Liner", capacity=6),
                BoatModel(user_id=1, boat_name="Kumari Breeze", registration_number="IND-TN-12-KK-201", boat_type="Coastal Trawler", capacity=10),
            ]
            db.add_all(demo_boats)
            db.commit()
    except Exception as e:
        db.rollback()
        print("Demo boat seeding notice:", e)
    finally:
        db.close()


Base.metadata.create_all(bind=engine)
seed_demo_boats()



# Temporary storage with authentic Tamil Nadu Coastal Data
boats = []
gps_locations = [
    {
        "boat_id": 1,
        "vessel_name": "Ocean Sentinel IX",
        "reg_no": "IND-TN-10-MM-884",
        "home_port": "Rameshwaram",
        "latitude": 9.2845,
        "longitude": 79.3120,
        "heading": 115,
        "speed": 12.4,
        "status": "SAFE ZONE",
        "timestamp": "2026-08-25T12:00:00Z"
    },
    {
        "boat_id": 2,
        "vessel_name": "Kadal Kani II",
        "reg_no": "IND-TN-01-CP-102",
        "home_port": "Chennai Port",
        "latitude": 13.0900,
        "longitude": 80.2950,
        "heading": 85,
        "speed": 10.2,
        "status": "SAFE ZONE",
        "timestamp": "2026-08-25T12:02:00Z"
    },
    {
        "boat_id": 3,
        "vessel_name": "Pearl Fisher V",
        "reg_no": "IND-TN-06-TT-505",
        "home_port": "Thoothukudi (Tuticorin)",
        "latitude": 8.7800,
        "longitude": 78.1800,
        "heading": 140,
        "speed": 14.1,
        "status": "SAFE ZONE",
        "timestamp": "2026-08-25T12:03:00Z"
    },
    {
        "boat_id": 4,
        "vessel_name": "Velankanni Star",
        "reg_no": "IND-TN-08-NG-304",
        "home_port": "Nagapattinam",
        "latitude": 10.7600,
        "longitude": 79.8600,
        "heading": 95,
        "speed": 11.0,
        "status": "SAFE ZONE",
        "timestamp": "2026-08-25T12:04:00Z"
    },
    {
        "boat_id": 5,
        "vessel_name": "Kumari Breeze",
        "reg_no": "IND-TN-12-KK-201",
        "home_port": "Kanyakumari",
        "latitude": 8.0750,
        "longitude": 77.5600,
        "heading": 175,
        "speed": 9.5,
        "status": "SAFE ZONE",
        "timestamp": "2026-08-25T12:05:00Z"
    }
]

maritime_borders = [
    {
        "border_id": 1,
        "name": "India - Sri Lanka International Maritime Boundary Line (IMBL - Palk Strait)",
        "description": "Historical bilateral IMBL demarcation in the Palk Bay and Palk Strait sector.",
        "coordinates": [
            [9.4000, 79.2000],
            [9.3500, 79.3500],
            [9.2500, 79.5000],
            [9.1200, 79.6800],
            [8.9500, 79.8500]
        ]
    },
    {
        "border_id": 2,
        "name": "Gulf of Mannar Maritime Biosphere Boundary",
        "description": "Marine protected boundary line off the coast of Thoothukudi and Ramanathapuram.",
        "coordinates": [
            [8.9500, 79.8500],
            [8.6000, 79.2000],
            [8.3000, 78.8000],
            [8.0000, 78.4000]
        ]
    }
]

tn_coastal_sectors = [
    {
        "key": "rameshwaram",
        "name": "Rameshwaram & Palk Strait",
        "description": "Kachchatheevu / IMBL Proximity Zone - High alert fishing sector",
        "center": [9.2885, 79.3129],
        "zoom": 11,
        "bounds": [[9.10, 79.05], [9.45, 79.60]]
    },
    {
        "key": "tuticorin",
        "name": "Gulf of Mannar & Thoothukudi",
        "description": "Major deep sea port and marine biosphere reserve sector",
        "center": [8.7642, 78.1348],
        "zoom": 11,
        "bounds": [[8.50, 77.90], [9.00, 78.50]]
    },
    {
        "key": "nagapattinam",
        "name": "Nagapattinam Coast",
        "description": "Central Tamil Nadu coastal fishing hub & Bay of Bengal access",
        "center": [10.7672, 79.8449],
        "zoom": 11,
        "bounds": [[10.50, 79.70], [11.00, 80.05]]
    },
    {
        "key": "chennai",
        "name": "Chennai Port Sector",
        "description": "Northern Tamil Nadu maritime commercial shipping lane",
        "center": [13.0827, 80.2707],
        "zoom": 11,
        "bounds": [[12.90, 80.15], [13.25, 80.45]]
    },
    {
        "key": "kanyakumari",
        "name": "Kanyakumari Waters",
        "description": "Southernmost tip - Ocean tri-junction (Bay of Bengal, Arabian Sea, Indian Ocean)",
        "center": [8.0883, 77.5385],
        "zoom": 11,
        "bounds": [[7.90, 77.35], [8.25, 77.75]]
    },
    {
        "key": "full_tn",
        "name": "Full Tamil Nadu Coast Line",
        "description": "Overview of entire 1,076 km Tamil Nadu coastline and maritime zone",
        "center": [10.2000, 79.2000],
        "zoom": 7,
        "bounds": [[7.80, 76.80], [13.50, 80.80]]
    }
]

tn_coastguard_stations = [
    {
        "station_id": "ICGS-MND",
        "name": "ICGS Mandapam (Rameshwaram)",
        "latitude": 9.2778,
        "longitude": 79.1245,
        "callsign": "MANDAPAM COAST GUARD",
        "radio_ch": "VHF CH 16 / 08",
        "status": "OPERATIONAL"
    },
    {
        "station_id": "ICGS-CHN",
        "name": "ICGS Chennai (Headquarters)",
        "latitude": 13.0850,
        "longitude": 80.2910,
        "callsign": "CHENNAI COAST GUARD",
        "radio_ch": "VHF CH 16 / 12",
        "status": "OPERATIONAL"
    },
    {
        "station_id": "ICGS-TUT",
        "name": "ICGS Thoothukudi",
        "latitude": 8.7520,
        "longitude": 78.1610,
        "callsign": "TUTICORIN COAST GUARD",
        "radio_ch": "VHF CH 16 / 06",
        "status": "OPERATIONAL"
    },
    {
        "station_id": "ICGS-KKL",
        "name": "ICGS Karaikal",
        "latitude": 10.9210,
        "longitude": 79.8420,
        "callsign": "KARAIKAL COAST GUARD",
        "radio_ch": "VHF CH 16 / 14",
        "status": "OPERATIONAL"
    }
]

sos_requests = [
    {
        "request_id": 1,
        "boat_id": 1,
        "vessel_name": "Ocean Sentinel IX",
        "message": "Engine failure near Palk Strait, request Coast Guard tow",
        "latitude": 9.2950,
        "longitude": 79.3500,
        "status": "pending"
    }
]


# -----------------------------
# MODELS
# -----------------------------

class BoatCreate(BaseModel):
    boat_id: Optional[str] = None
    fisherman_name: Optional[str] = None
    boat_name: Optional[str] = None
    registration_number: Optional[str] = None
    boat_type: Optional[str] = "Deep Sea Trawler"
    capacity: Optional[int] = 10
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# -----------------------------
# HOME / API ROOT
# -----------------------------

@app.get("/api")
def home():
    return {
        "message": "Welcome to OceanMind Backend API"
    }


# -----------------------------
# STATUS
# -----------------------------

@app.get("/api/status")
def status_info():
    return {
        "project": "OceanMind",
        "status": "Backend is running"
    }


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# -----------------------------
# SIGNUP
# -----------------------------

@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(user: SignupRequest, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    existing_aadhaar = db.query(User).filter(User.aadhaar_number == user.aadhaar_number).first()
    if existing_aadhaar:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aadhaar number already exists"
        )

    hashed_password = hash_password(user.password)
    new_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        date_of_birth=user.date_of_birth,
        nationality=user.nationality,
        state=user.state,
        district=user.district,
        aadhaar_number=user.aadhaar_number,
        phone=user.phone,
        email=user.email,
        password=hashed_password,
        role=user.role,
    )

    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with provided details already exists"
        )
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.user_id,
        "email": new_user.email
    }


# -----------------------------
# LOGIN
# -----------------------------

@app.post("/api/auth/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):

    existing_user = db.query(User).filter(User.email == user.email).first()
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    password_correct = verify_password(
        user.password,
        existing_user.password,
    )
    if not password_correct:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={
            "sub": existing_user.email,
            "user_id": existing_user.user_id,
            "role": existing_user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get("/api/auth/me", response_model=UserMeResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


# -----------------------------
# ADD BOAT
# -----------------------------

@app.post("/api/boats")
def add_boat(boat: BoatCreate, db: Session = Depends(get_db)):
    name = boat.boat_name or boat.fisherman_name or "Demo Vessel"
    reg = boat.registration_number or boat.boat_id or "IND-TN-9999"
    btype = boat.boat_type or "Deep Sea Trawler"
    cap = boat.capacity if boat.capacity is not None else 10

    new_boat = BoatModel(
        user_id=1,
        boat_name=name,
        registration_number=reg,
        boat_type=btype,
        capacity=cap
    )
    db.add(new_boat)
    db.commit()
    db.refresh(new_boat)

    return {
        "message": "Boat added successfully",
        "boat": {
            "boat_id": new_boat.boat_id,
            "boat_name": new_boat.boat_name,
            "registration_number": new_boat.registration_number,
            "boat_type": new_boat.boat_type,
            "capacity": new_boat.capacity,
            "user_id": new_boat.user_id
        }
    }


# -----------------------------
# GET BOATS
# -----------------------------

@app.get("/api/boats")
def get_boats_api(db: Session = Depends(get_db)):
    db_boats = db.query(BoatModel).order_by(BoatModel.boat_id.asc()).all()
    boats_list = [
        {
            "boat_id": b.boat_id,
            "boat_name": b.boat_name,
            "registration_number": b.registration_number,
            "boat_type": b.boat_type,
            "capacity": b.capacity,
            "user_id": b.user_id
        }
        for b in db_boats
    ]
    return {
        "total_boats": len(boats_list),
        "boats": boats_list
    }


@app.get("/gps-locations")
def get_gps_locations():
    return {
        "total_locations": len(gps_locations),
        "gps_locations": gps_locations
    }


@app.get("/maritime-borders")
def get_maritime_borders():
    return {
        "total_borders": len(maritime_borders),
        "maritime_borders": maritime_borders
    }


@app.get("/sos-requests")
def get_sos_requests():
    return {
        "total_requests": len(sos_requests),
        "sos_requests": sos_requests
    }


# -----------------------------
# DEMO SIMULATED LIVE MULTI-VESSEL TELEMETRY
# -----------------------------

simulated_telemetry = {
    1: {
        "boat_id": 1,
        "boat_name": "Ocean Sentinel IX",
        "registration_number": "IND-TN-10-MM-884",
        "home_port": "Rameshwaram",
        "sector": "Rameshwaram / Palk Strait",
        "latitude": 9.2845,
        "longitude": 79.3120,
        "heading": 115.0,
        "speed": 12.4,
        "status": "SAFE ZONE",
        "timestamp": datetime.now(timezone.utc).isoformat()
    },
    2: {
        "boat_id": 2,
        "boat_name": "Kadal Kani II",
        "registration_number": "IND-TN-01-CP-102",
        "home_port": "Chennai Port",
        "sector": "Chennai Port Sector",
        "latitude": 13.0900,
        "longitude": 80.2950,
        "heading": 85.0,
        "speed": 10.2,
        "status": "SAFE ZONE",
        "timestamp": datetime.now(timezone.utc).isoformat()
    },
    3: {
        "boat_id": 3,
        "boat_name": "Pearl Fisher V",
        "registration_number": "IND-TN-06-TT-505",
        "home_port": "Thoothukudi (Tuticorin)",
        "sector": "Gulf of Mannar",
        "latitude": 8.7800,
        "longitude": 78.1800,
        "heading": 140.0,
        "speed": 14.1,
        "status": "SAFE ZONE",
        "timestamp": datetime.now(timezone.utc).isoformat()
    },
    4: {
        "boat_id": 4,
        "boat_name": "Velankanni Star",
        "registration_number": "IND-TN-08-NG-304",
        "home_port": "Nagapattinam",
        "sector": "Nagapattinam Coast",
        "latitude": 10.7600,
        "longitude": 79.8600,
        "heading": 95.0,
        "speed": 11.0,
        "status": "SAFE ZONE",
        "timestamp": datetime.now(timezone.utc).isoformat()
    },
    5: {
        "boat_id": 5,
        "boat_name": "Kumari Breeze",
        "registration_number": "IND-TN-12-KK-201",
        "home_port": "Kanyakumari",
        "sector": "Kanyakumari Waters",
        "latitude": 8.0750,
        "longitude": 77.5600,
        "heading": 175.0,
        "speed": 9.5,
        "status": "SAFE ZONE",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
}


def step_simulated_telemetry():
    now_iso = datetime.now(timezone.utc).isoformat()
    for b_id, vessel in simulated_telemetry.items():
        speed_kts = vessel.get("speed", 10.0)
        heading_deg = vessel.get("heading", 90.0)

        # Calculate gradual movement (smooth ~0.0002 deg step)
        heading_rad = math.radians(heading_deg)
        delta_lat = math.cos(heading_rad) * (speed_kts * 0.00002)
        delta_lng = math.sin(heading_rad) * (speed_kts * 0.00002)

        new_lat = round(vessel["latitude"] + delta_lat, 5)
        new_lng = round(vessel["longitude"] + delta_lng, 5)

        # Boundary rebound bounds for Tamil Nadu coastal sea space
        if new_lat < 7.8 or new_lat > 13.5 or new_lng < 77.2 or new_lng > 80.8:
            vessel["heading"] = round((heading_deg + 140 + random.uniform(-10, 10)) % 360, 1)
        else:
            vessel["latitude"] = new_lat
            vessel["longitude"] = new_lng
            vessel["heading"] = round((heading_deg + random.uniform(-3, 3)) % 360, 1)

        # Vary speed slightly +/- 0.2 kts within 6 to 16 kts
        new_speed = round(max(6.0, min(16.0, speed_kts + random.uniform(-0.2, 0.2))), 1)
        vessel["speed"] = new_speed
        vessel["timestamp"] = now_iso


@app.get("/api/live-telemetry")
def get_live_telemetry():
    step_simulated_telemetry()
    vessels_list = list(simulated_telemetry.values())
    return {
        "status": "success",
        "simulation": True,
        "environment": "DEMO SIMULATED MULTI-VESSEL TELEMETRY",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_vessels": len(vessels_list),
        "vessels": vessels_list
    }


@app.get("/alerts", response_model=list[AlertResponse])
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.alert_id.asc()).all()
    return alerts


@app.get("/boats", response_model=list[BoatResponse])
def get_boats(db: Session = Depends(get_db)):
    boats = db.query(BoatModel).order_by(BoatModel.boat_id.asc()).all()
    return boats


@app.get("/api/tn-coastal-sectors")
def get_tn_coastal_sectors():
    return {
        "status": "success",
        "total_sectors": len(tn_coastal_sectors),
        "sectors": tn_coastal_sectors
    }


@app.get("/api/tn-coastguard-stations")
def get_tn_coastguard_stations():
    return {
        "status": "success",
        "total_stations": len(tn_coastguard_stations),
        "stations": tn_coastguard_stations
    }


# -----------------------------
# FRONTEND STATIC FILES MOUNT (UNIFIED DEPLOYMENT)
# -----------------------------
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "oceanmind", "oceanmind"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")