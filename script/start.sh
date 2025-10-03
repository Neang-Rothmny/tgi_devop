#!/bin/bash
set -e

DEPLOY_PATH="/home/ny/projects/final"
VENV_PATH="/home/ny/projects/venv"

echo "=== Deploying frontend ==="
cd $DEPLOY_PATH/frontend
npm install
npm run build


# echo "=== Deploying backend ==="
# cd $DEPLOY_PATH/backend
# source $VENV_PATH/bin/activate
# # Restart backend using PM2 and uvicorn
# pm2 start uvicorn --name backend -- \
#     app.main:app --host 0.0.0.0 --port 8000 || pm2 restart backend

# echo "Deployment complete 🚀"
