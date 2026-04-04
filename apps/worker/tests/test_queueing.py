import base64
import json

import pytest
from google.api_core import exceptions as gcloud_exceptions

from worker import queueing
from worker.queueing import PubSubQueueConsumer, parse_pubsub_push


def test_parse_pubsub_push_event():
    raw = {
        "schema_version": "v1",
        "trace_id": "trace-1",
        "job_id": "job-1",
        "document_id": "doc-1",
        "user_id": "user-1",
        "storage_uri": "gs://bucket/path.pdf",
        "uploaded_at": "2026-04-04T12:00:00Z",
    }
    payload = {
        "message": {
            "data": base64.b64encode(json.dumps(raw).encode("utf-8")).decode("utf-8"),
        }
    }
    event = parse_pubsub_push(payload)
    assert event.job_id == "job-1"
    assert event.storage_uri.startswith("gs://")


def test_pubsub_consumer_auto_creates_resources(monkeypatch: pytest.MonkeyPatch):
    class FakePublisher:
        def __init__(self):
            self.created_topic = False

        def topic_path(self, project_id: str, topic_name: str) -> str:
            return f"projects/{project_id}/topics/{topic_name}"

        def get_topic(self, request):
            raise gcloud_exceptions.NotFound("missing topic")

        def create_topic(self, request):
            self.created_topic = True
            return request

    class FakeSubscriber:
        def __init__(self):
            self.created_subscription = False

        def subscription_path(self, project_id: str, sub_name: str) -> str:
            return f"projects/{project_id}/subscriptions/{sub_name}"

        def get_subscription(self, request):
            raise gcloud_exceptions.NotFound("missing sub")

        def create_subscription(self, request):
            self.created_subscription = True
            return request

        def pull(self, request, timeout=None):
            return type("Response", (), {"received_messages": []})()

        def acknowledge(self, request):
            return None

    fake_pub = FakePublisher()
    fake_sub = FakeSubscriber()
    monkeypatch.setattr(queueing.pubsub_v1, "PublisherClient", lambda: fake_pub)
    monkeypatch.setattr(queueing.pubsub_v1, "SubscriberClient", lambda: fake_sub)
    monkeypatch.setattr(queueing.settings, "pubsub_project_id", "spendsight-local")
    monkeypatch.setattr(queueing.settings, "pubsub_topic", "bill-jobs")
    monkeypatch.setattr(queueing.settings, "pubsub_subscription", "bill-jobs-sub")
    monkeypatch.setattr(queueing.settings, "pubsub_auto_create_resources", True)

    consumer = PubSubQueueConsumer()
    assert consumer.pull() is None
    assert fake_pub.created_topic is True
    assert fake_sub.created_subscription is True
