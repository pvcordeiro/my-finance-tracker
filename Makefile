.PHONY: help build run stop clean test push

# Variables
IMAGE_NAME ?= pvcordeiro/my-finance-tracker
VERSION ?= latest
CONTAINER_NAME = finance-tracker

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

build: ## Build the Docker image
	docker build -t $(IMAGE_NAME):$(VERSION) .

run: ## Run the container with docker-compose
	docker-compose up -d

stop: ## Stop the container
	docker-compose down

logs: ## View container logs
	docker-compose logs -f

clean: ## Stop and remove container, image, and volumes
	docker-compose down -v
	docker rmi $(IMAGE_NAME):$(VERSION) 2>/dev/null || true

test: ## Run the test script
	./test-docker.sh

push: ## Push image to Docker Hub
	docker push $(IMAGE_NAME):$(VERSION)

pull: ## Pull latest image from Docker Hub
	docker pull $(IMAGE_NAME):$(VERSION)

update: pull stop run ## Update to latest version

rebuild: ## Rebuild and restart
	docker-compose up -d --build

shell: ## Open a shell in the running container
	docker exec -it $(CONTAINER_NAME) /bin/sh

backup: ## Backup database
	@if [ ! -d "./data" ]; then echo "No data directory found"; exit 1; fi
	tar -czf finance-tracker-backup-$$(date +%Y%m%d-%H%M%S).tar.gz data/
	@echo "Backup created: finance-tracker-backup-$$(date +%Y%m%d-%H%M%S).tar.gz"

status: ## Show container status
	docker ps -a | grep $(CONTAINER_NAME) || echo "Container not found"

health: ## Check container health
	docker inspect --format='{{.State.Health.Status}}' $(CONTAINER_NAME) 2>/dev/null || echo "Container not running or no health check"
