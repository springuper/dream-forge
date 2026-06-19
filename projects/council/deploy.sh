# GCP Cloud Run deployment script for council

set -e

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
  --set-env-vars "PORT=8080" \
  --set-env-vars "ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic" \
  --set-env-vars "ANTHROPIC_AUTH_TOKEN=$ANTHROPIC_AUTH_TOKEN" \
  --set-env-vars "ANTHROPIC_MODEL=MiniMax-M2.7" \
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --set-env-vars "GOOGLE_REDIRECT_URI=https://$SERVICE_NAME-$PROJECT_ID.$REGION.run.app/auth/callback" \
  --set-env-vars "DATABASE_URL=postgresql://postgres:17jnmkdfnd998dfUK@db.vpzmlojlabwkyspvybew.supabase.co:5432/postgres" \
  --project=$PROJECT_ID

echo "Done! Check: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"