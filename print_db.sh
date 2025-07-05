#!/bin/bash

# Source the .env file to get environment variables like IIKO_API_URL, IIKO_API_TOKEN
# Note: DATABASE_URL is typically defined in docker-compose.yml for services.
# We'll pass it explicitly in the docker compose run command.
source .env

echo "--- Printing Database Data ---"
docker compose run --rm \
  -e DATABASE_URL="${DATABASE_URL}" \
  web \
  python /app/print_db_data.py

echo "--- Database Data Print Complete ---"
