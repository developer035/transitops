from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from configurations import check_connection, init_indexes
from auth import auth
from deps import get_current_user
from routers import drivers, dashboard, vehicles, trips, maintenance, expenses, reports, admin

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
app.include_router(drivers.router, prefix="/drivers", tags=["drivers"], dependencies=[Depends(get_current_user)])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])
app.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"], dependencies=[Depends(get_current_user)])
app.include_router(trips.router, prefix="/trips", tags=["trips"], dependencies=[Depends(get_current_user)])
app.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"], dependencies=[Depends(get_current_user)])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"], dependencies=[Depends(get_current_user)])
app.include_router(reports.router, prefix="/reports", tags=["reports"], dependencies=[Depends(get_current_user)])

# DEV-ONLY admin router — no auth required
app.include_router(admin.router, prefix="/admin", tags=["admin"])