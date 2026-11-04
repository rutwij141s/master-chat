.PHONY: up down build logs test-py test-go test-all lint clean

up:
	docker-compose up -d

down:
	docker-compose down

build:
	docker-compose build

logs:
	docker-compose logs -f

test-py:
	cd ai-service && pytest -v

test-go:
	cd gateway-go && go test -v ./...

test-all: test-py test-go

lint:
	cd gateway-go && go vet ./...
	cd ai-service && python3 -m py_compile app/**/*.py

clean:
	docker-compose down -v
	find . -type d -name "__pycache__" -exec rm -rf {} +
