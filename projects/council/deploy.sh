#!/bin/bash
# GCP Cloud Run deployment script for council

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/backend/.env.production"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

PROJECT_ID="dream-forge-498001"
REGION="asia-east1"
SERVICE_NAME="council"
REPOSITORY="council"
IMAGE_TAG="asia-east1-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE_NAME:v$(date +%Y%m%d%H%M%S)"

echo "Building Docker image locally..."
podman build -t "$SERVICE_NAME" .

echo "Tagging image..."
podman tag "$SERVICE_NAME" "$IMAGE_TAG"

echo "Pushing to Artifact Registry..."
podman push "$IMAGE_TAG"

echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "DATABASE_URL=$DATABASE_URL" \
  --set-env-vars "ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL" \
  --set-env-vars "ANTHROPIC_AUTH_TOKEN=$ANTHROPIC_AUTH_TOKEN" \
  --set-env-vars "ANTHROPIC_MODEL=$ANTHROPIC_MODEL" \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL" \
  --set-env-vars "SUPABASE_KEY=$SUPABASE_KEY" \
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --set-env-vars "GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI" \
  --project="$PROJECT_ID"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format="value(status.url)" --project="$PROJECT_ID")
echo ""
echo "Done! Service URL: $SERVICE_URL"
echo "Check: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"
