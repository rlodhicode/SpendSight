Write-Host "Starting SpendSight local infrastructure..."
docker compose -f infra/docker-compose.yml up -d postgres redis

Write-Host "Infrastructure is up."
Write-Host "Next:"
Write-Host "1) Run API in apps/api"
Write-Host "2) Run worker in apps/worker"
Write-Host "3) Run web in apps/web"

