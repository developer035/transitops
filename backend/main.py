from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from configurations import check_connection, init_indexes
from auth import auth
from routers import drivers, dashboard

app = FastAPI(title="TransitOps API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten before demo if time allows
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db():
    check_connection()
    init_indexes()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(drivers.router, prefix="/drivers", tags=["drivers"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# others plug in here as teammates finish:
# app.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
# app.include_router(trips.router, prefix="/trips", tags=["trips"])
# app.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
# app.include_router(fuel.router, prefix="/fuel", tags=["fuel"])
# app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])