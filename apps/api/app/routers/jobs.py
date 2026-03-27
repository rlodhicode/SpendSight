import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Document, ProcessingJob, User
from ..schemas import JobStatusResponse
from ..services import redis_client

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = (
        db.query(ProcessingJob)
        .join(Document, Document.id == ProcessingJob.document_id)
        .filter(ProcessingJob.id == job_id, Document.user_id == user.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    cached = redis_client.get(f"job:{job_id}")
    if cached:
        payload = json.loads(cached)
        return JobStatusResponse(**payload)

    return JobStatusResponse(job_id=job.id, status=job.status, error_message=job.error_message, updated_at=job.updated_at)
