# GCP Cloud Run deployment script for council

# Set your project ID
PROJECT_ID=dream-forge-498001
REGION=us-central1
SERVICE_NAME=council

# Build and push Docker image
echo "Building Docker image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME:v1 --project=$PROJECT_ID

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic" \
  --set-env-vars "ANTHROPIC_AUTH_TOKEN=$ANTHROPIC_AUTH_TOKEN" \
  --set-env-vars "ANTHROPIC_MODEL=MiniMax-M2.7" \
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --project=$PROJECT_ID

echo "Done! Check: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"