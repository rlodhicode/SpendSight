param(
  [string]$ProjectId = "spendsight",
  [string]$Topic = "bill-jobs",
  [string]$Subscription = "bill-jobs-sub",
  [string]$DeadLetterTopic = "bill-jobs-dlq",
  [string]$DeadLetterSubscription = "bill-jobs-dlq-sub",
  [string]$PushEndpoint = ""
)

if (-not $PushEndpoint) {
  Write-Error "Provide -PushEndpoint (for example https://worker-xyz.run.app/pubsub/push)"
  exit 1
}

gcloud pubsub topics create $Topic --project=$ProjectId
gcloud pubsub topics create $DeadLetterTopic --project=$ProjectId

gcloud pubsub subscriptions create $DeadLetterSubscription `
  --topic=$DeadLetterTopic `
  --project=$ProjectId

gcloud pubsub subscriptions create $Subscription `
  --topic=$Topic `
  --project=$ProjectId `
  --push-endpoint=$PushEndpoint `
  --dead-letter-topic=$DeadLetterTopic `
  --max-delivery-attempts=5 `
  --min-retry-delay=10s `
  --max-retry-delay=300s

Write-Host "Pub/Sub topics and subscriptions configured."
