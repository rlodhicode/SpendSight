from pathlib import Path
import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, engine
from .routers import analytics, auth, bills, jobs, review

logger = logging.getLogger("spendsight-api")

app = FastAPI(title="SpendSight API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _initialize_database_with_retry(max_attempts: int = 6, delay_seconds: int = 3) -> None:
    """
    Initialize tables without hard-failing service startup.

    Cloud Run startup should not crash if Cloud SQL is briefly unavailable during
    a deploy or resume operation.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            Base.metadata.create_all(bind=engine)
            if attempt > 1:
                logger.info("Database initialization succeeded on attempt %s.", attempt)
            return
        except Exception as exc:
            if attempt == max_attempts:
                logger.exception(
                    "Database initialization failed after %s attempts. API will stay up, "
                    "but DB-backed endpoints may return errors until connectivity/permissions are fixed.",
                    max_attempts,
                )
                return
            logger.warning(
                "Database initialization attempt %s/%s failed: %s. Retrying in %ss.",
                attempt,
                max_attempts,
                exc,
                delay_seconds,
            )
            time.sleep(delay_seconds)


@app.on_event("startup")
def startup() -> None:
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    _initialize_database_with_retry()


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(bills.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(review.router, prefix="/api/v1")

