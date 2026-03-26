PYTHON ?= python

.PHONY: dev test lint frontend-dev frontend-build migrate seed install-prod update-prod backup-prod uninstall-prod

dev:
	$(PYTHON) runserver.py

test:
	pytest tests/ -v

lint:
	cd frontend && npm run lint

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

migrate:
	alembic upgrade head

seed:
	$(PYTHON) seed_admin.py

install-prod:
	bash scripts/install.sh

update-prod:
	bash scripts/update.sh

backup-prod:
	bash scripts/backup-db.sh

uninstall-prod:
	bash scripts/uninstall.sh
