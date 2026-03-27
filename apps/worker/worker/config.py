from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://spendsight:spendsight@localhost:5432/spendsight"
    redis_url: str = "redis://localhost:6379/0"
    queue_name: str = "bill-jobs"
    upload_dir: str = "./uploads"
    poll_timeout_seconds: int = 5
    job_status_ttl_seconds: int = 86_400
    document_ai_enabled: bool = False
    gcp_project_id: str = ""
    gcp_location: str = "us"
    gcp_document_ai_processor_id: str = ""
    google_application_credentials: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()

