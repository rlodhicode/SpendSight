from datetime import datetime

import pytest
from google.api_core import exceptions as gcloud_exceptions

from app.events import ProcessingEvent
from app import queueing
from app.queueing import PubSubQueuePublisher, RedisQueuePublisher


class FakeRedis:
    def __init__(self):
        self.calls = []

    def lpush(self, queue_name, payload):
        self.calls.append((queue_name, payload))


def test_processing_event_contract():
    event = ProcessingEvent(
        trace_id="trace-1",
        job_id="job-1",
        document_id="doc-1",
        user_id="user-1",
        storage_uri="gs://bucket/file.pdf",
        uploaded_at=datetime(2026, 4, 4, 12, 0, 0),
    )
    assert event.schema_version == "v1"
    assert event.storage_uri.startswith("gs://")


def test_redis_queue_publisher_pushes_json():
    fake = FakeRedis()
    publisher = RedisQueuePublisher(fake)
    event = ProcessingEvent(
        trace_id="trace-1",
        job_id="job-1",
        document_id="doc-1",
        user_id="user-1",
        storage_uri="local://foo/bar.pdf",
    )
    publisher.publish(event)
    assert len(fake.calls) == 1
    assert "job-1" in fake.calls[0][1]


def test_pubsub_publisher_auto_creates_topic(monkeypatch: pytest.MonkeyPatch):
    class FakeFuture:
        def result(self, timeout=None):
            return "ok"

    class FakePublisher:
        def __init__(self):
            self.created = False
            self.published = False

        def topic_path(self, project_id: str, topic_name: str) -> str:
            return f"projects/{project_id}/topics/{topic_name}"

        def get_topic(self, request):
            raise gcloud_exceptions.NotFound("missing")

        def create_topic(self, request):
            self.created = True
            return request

        def publish(self, topic_path, message, **attrs):
            self.published = True
            return FakeFuture()

    fake = FakePublisher()
    monkeypatch.setattr(queueing.pubsub_v1, "PublisherClient", lambda: fake)
    monkeypatch.setattr(queueing.settings, "queue_provider", "pubsub")
    monkeypatch.setattr(queueing.settings, "pubsub_project_id", "spendsight-local")
    monkeypatch.setattr(queueing.settings, "pubsub_topic", "bill-jobs")
    monkeypatch.setattr(queueing.settings, "pubsub_auto_create_topic", True)

    publisher = PubSubQueuePublisher()
    event = ProcessingEvent(
        trace_id="trace-1",
        job_id="job-1",
        document_id="doc-1",
        user_id="user-1",
        storage_uri="gs://bucket/file.pdf",
    )
    publisher.publish(event)
    assert fake.created is True
    assert fake.published is True
