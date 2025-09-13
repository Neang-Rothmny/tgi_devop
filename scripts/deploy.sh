#!/bin/bash
set -e

DEPLOY_PATH="/home/ny/projects/final"
VENV_PATH="/home/ny/projects/venv"

echo "=== Deploying frontend ==="
cd $DEPLOY_PATH/frontend
npm install --legacy-peer-deps
# Restart frontend service
sudo systemctl restart frontend.service

echo "=== Deploying backend ==="
# Restart backend service
sudo systemctl restart backend.service

echo "Deployment complete 🚀"
