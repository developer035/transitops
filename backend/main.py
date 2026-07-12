from fastapi import FastAPI
from configurations import check_connection, init_indexes
from auth import auth

app = FastAPI(title="TransitOps API")

@app.on_event("startup")
def startup_db():
    check_connection()
    init_indexes()

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(auth.router, prefix="/auth", tags=["auth"])

# others plug in here as teammates finish:
# app.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
# app.include_router(trips.router, prefix="/trips", tags=["trips"])
# app.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
# app.include_router(fuel.router, prefix="/fuel", tags=["fuel"])
# app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
# app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])