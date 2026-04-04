from datetime import datetime

from pydantic import BaseModel, Field


class ProcessingEvent(BaseModel):
    schema_version: str = "v1"
    trace_id: str
    job_id: str
    document_id: str
    user_id: str
    storage_uri: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
