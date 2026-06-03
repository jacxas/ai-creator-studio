#!/usr/bin/env bash
set -euo pipefail

sudo apt-get update
sudo apt-get install -y curl git docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker

echo "Instalación base completada"
