import json
import os
from abc import ABC, abstractmethod

import redis
from google.api_core import exceptions as gcloud_exceptions
from google.cloud import pubsub_v1

from .config import settings
from .events import ProcessingEvent


class QueuePublisher(ABC):
    @abstractmethod
    def publish(self, event: ProcessingEvent) -> None:
        raise NotImplementedError


class RedisQueuePublisher(QueuePublisher):
    def __init__(self, redis_client: redis.Redis) -> None:
        self.redis_client = redis_client

    def publish(self, event: ProcessingEvent) -> None:
        self.redis_client.lpush(settings.queue_name, event.model_dump_json())


class PubSubQueuePublisher(QueuePublisher):
    def __init__(self) -> None:
        if settings.pubsub_emulator_host:
            os.environ["PUBSUB_EMULATOR_HOST"] = settings.pubsub_emulator_host
        project_id = settings.pubsub_project_id or settings.gcp_project_id
        if not project_id:
            raise ValueError("PUBSUB_PROJECT_ID or GCP_PROJECT_ID must be configured")
        self.project_id = project_id
        self.topic_name = settings.pubsub_topic
        self.publisher = pubsub_v1.PublisherClient()
        self.topic_path = self.publisher.topic_path(self.project_id, self.topic_name)
        if settings.pubsub_auto_create_topic:
            self._ensure_topic_exists()

    def _ensure_topic_exists(self) -> None:
        try:
            self.publisher.get_topic(request={"topic": self.topic_path})
        except gcloud_exceptions.NotFound:
            self.publisher.create_topic(request={"name": self.topic_path})
        except gcloud_exceptions.AlreadyExists:
            # Another process created it simultaneously.
            pass

    def publish(self, event: ProcessingEvent) -> None:
        payload = event.model_dump(mode="json")
        message = json.dumps(payload).encode("utf-8")
        self.publisher.publish(
            self.topic_path,
            message,
            trace_id=event.trace_id,
            schema_version=event.schema_version,
            job_id=event.job_id,
            user_id=event.user_id,
        ).result(timeout=10)


def get_queue_publisher(redis_client: redis.Redis) -> QueuePublisher:
    provider = settings.queue_provider.lower()
    if provider == "pubsub":
        return PubSubQueuePublisher()
    return RedisQueuePublisher(redis_client)
