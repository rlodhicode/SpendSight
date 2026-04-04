from __future__ import annotations
import base64
import json
import os
from abc import ABC, abstractmethod
from typing import Any, Optional

import redis
from google.api_core import exceptions as gcloud_exceptions
from google.cloud import pubsub_v1

from .config import settings
from .events import ProcessingEvent


class QueueConsumer(ABC):
    @abstractmethod
    def pull(self) -> Optional[ProcessingEvent]:
        raise NotImplementedError


class RedisQueueConsumer(QueueConsumer):
    def __init__(self, redis_client: redis.Redis) -> None:
        self.redis_client = redis_client

    def pull(self) -> Optional[ProcessingEvent]:
        item = self.redis_client.brpop(settings.queue_name, timeout=settings.poll_timeout_seconds)
        if item is None:
            return None
        _, raw = item
        payload = json.loads(raw)
        return ProcessingEvent.model_validate(payload)


class PubSubQueueConsumer(QueueConsumer):
    def __init__(self) -> None:
        if settings.pubsub_emulator_host:
            os.environ["PUBSUB_EMULATOR_HOST"] = settings.pubsub_emulator_host
        project_id = settings.pubsub_project_id or settings.gcp_project_id
        if not project_id:
            raise ValueError("PUBSUB_PROJECT_ID or GCP_PROJECT_ID must be configured")
        self.project_id = project_id
        self.topic_name = settings.pubsub_topic
        self.subscription_name = settings.pubsub_subscription
        self.publisher = pubsub_v1.PublisherClient()
        self.subscriber = pubsub_v1.SubscriberClient()
        self.topic_path = self.publisher.topic_path(self.project_id, self.topic_name)
        self.subscription_path = self.subscriber.subscription_path(self.project_id, self.subscription_name)
        if settings.pubsub_auto_create_resources:
            self._ensure_resources()

    def _ensure_resources(self) -> None:
        try:
            self.publisher.get_topic(request={"topic": self.topic_path})
        except gcloud_exceptions.NotFound:
            self.publisher.create_topic(request={"name": self.topic_path})
        except gcloud_exceptions.AlreadyExists:
            pass

        try:
            self.subscriber.get_subscription(request={"subscription": self.subscription_path})
        except gcloud_exceptions.NotFound:
            self.subscriber.create_subscription(
                request={"name": self.subscription_path, "topic": self.topic_path}
            )
        except gcloud_exceptions.AlreadyExists:
            pass

    def pull(self) -> Optional[ProcessingEvent]:
        try:
            response = self.subscriber.pull(
                request={
                    "subscription": self.subscription_path,
                    "max_messages": 1,
                },
                timeout=settings.poll_timeout_seconds,
            )
        except gcloud_exceptions.DeadlineExceeded:
            return None

        if not response.received_messages:
            return None

        message = response.received_messages[0]
        try:
            payload = json.loads(message.message.data.decode("utf-8"))
            event = ProcessingEvent.model_validate(payload)
        except Exception:
            # Ack poison payload to prevent infinite redelivery in local dev.
            self.subscriber.acknowledge(
                request={"subscription": self.subscription_path, "ack_ids": [message.ack_id]}
            )
            raise

        self.subscriber.acknowledge(
            request={"subscription": self.subscription_path, "ack_ids": [message.ack_id]}
        )
        return event


def parse_pubsub_push(payload: dict[str, Any]) -> ProcessingEvent:
    message = payload.get("message", {})
    if "data" not in message:
        raise ValueError("Invalid Pub/Sub push payload: missing message.data")
    data = base64.b64decode(message["data"]).decode("utf-8")
    parsed = json.loads(data)
    return ProcessingEvent.model_validate(parsed)


