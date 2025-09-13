#!/bin/bash
set -e

DEPLOY_PATH="/home/ny/project/final"
VENV_PATH="/home/ny/project/venv"

echo "=== Deploying frontend ==="
cd $DEPLOY_PATH/frontend
npm install
pm2 start npm --name frontend -- run start || pm2 restart frontend

echo "=== Deploying backend ==="
cd $DEPLOY_PATH/backend
source $VENV_PATH/bin/activate
# Restart backend using PM2 and uvicorn
pm2 start uvicorn --name backend -- \
    app.main:app --host 0.0.0.0 --port 8000 || pm2 restart backend

echo "Deployment complete 🚀"
