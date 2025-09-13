#!/bin/bash
set -e

DEPLOY_PATH="/home/ny/projects/final"
VENV_PATH="/home/ny/projects/venv"

echo "=== Deploying frontend ==="
cd $DEPLOY_PATH/frontend
npm install


echo "npm install complete 🚀"
