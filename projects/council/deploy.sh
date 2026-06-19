# GCP Cloud Run deployment script for council

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/backend/.env.production"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

PROJECT_ID=dream-forge-498001
REGION=us-central1
SERVICE_NAME=council
IMAGE=gcr.io/$PROJECT_ID/$SERVICE_NAME:v1

echo "Building Docker image..."
podman build -t $IMAGE .
podman push $IMAGE

echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "PORT=$PORT" \
  --set-env-vars "ANTHROPIC_BASE_URL=$ANTHROPIC_BASE_URL" \
  --set-env-vars "ANTHROPIC_AUTH_TOKEN=$ANTHROPIC_AUTH_TOKEN" \
  --set-env-vars "ANTHROPIC_MODEL=$ANTHROPIC_MODEL" \
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --set-env-vars "GOOGLE_REDIRECT_URI=$GOOGLE_REDIRECT_URI" \
  --set-env-vars "DATABASE_URL=$DATABASE_URL" \
  --project=$PROJECT_ID

echo "Done! Check: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"