from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://spendsight:spendsight@localhost:5432/spendsight"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "replace-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    upload_dir: str = "./uploads"
    queue_name: str = "bill-jobs"
    job_status_ttl_seconds: int = 86_400
    analytics_cache_ttl_seconds: int = 600
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    document_ai_enabled: bool = False
    gcp_project_id: str = ""
    gcp_location: str = "us"
    gcp_document_ai_processor_id: str = ""
    google_application_credentials: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

