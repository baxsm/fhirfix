#!/bin/sh
# builds the inferno image the conformance profile runs. the test kit publishes no
# prebuilt image, so it is cloned at a pinned tag and built locally.
set -e

KIT_TAG="v0.13.4"
KIT_REPO="https://github.com/inferno-framework/davinci-plan-net-test-kit.git"
CLONE_DIR=".inferno/plan-net"
IMAGE="fhirfix-inferno-plannet:${KIT_TAG}"

if [ ! -d "$CLONE_DIR" ]; then
  mkdir -p .inferno
  git clone --depth 1 --branch "$KIT_TAG" "$KIT_REPO" "$CLONE_DIR"
fi

docker build -t "$IMAGE" "$CLONE_DIR"
docker compose --profile conformance up -d

# inferno ships an empty sqlite file, so its schema must be migrated once
docker compose --profile conformance run --rm inferno bundle exec rake db:migrate
docker compose --profile conformance restart inferno inferno-worker

echo "inferno ready on http://localhost:4568"
