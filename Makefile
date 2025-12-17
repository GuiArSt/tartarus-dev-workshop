.PHONY: dev build start lint format fix clean install check typecheck help

# Default - run from web directory
all: check build

# Delegate everything to web/
dev:
	cd web && npm run dev

build:
	cd web && npm run build

start:
	cd web && npm run start

lint:
	cd web && npx eslint .

format:
	cd web && npx prettier --check "**/*.{ts,tsx,js,jsx,json,css}"

fix:
	cd web && npx prettier --write "**/*.{ts,tsx,js,jsx,json,css}"
	cd web && npx eslint --fix .

typecheck:
	cd web && npx tsc --noEmit

check:
	cd web && npx prettier --check "**/*.{ts,tsx,js,jsx,json,css}"
	cd web && npx eslint .
	cd web && npx tsc --noEmit
	@echo "✅ All checks passed!"

install:
	cd web && npm install --legacy-peer-deps

clean:
	rm -rf web/.next
	rm -rf web/node_modules/.cache

clean-all: clean
	rm -rf web/node_modules
	rm -rf web/package-lock.json

# Database
db-backup:
	curl -X POST http://localhost:3000/api/db/backup

sync-export:
	cd web && npx ts-node scripts/sync-db.ts export

sync-import:
	cd web && npx ts-node scripts/sync-db.ts import

sync-compare:
	cd web && npx ts-node scripts/sync-db.ts compare

help:
	@echo ""
	@echo "📚 Developer Journal Workspace"
	@echo "==============================="
	@echo ""
	@echo "  make dev    - Start dev server"
	@echo "  make build  - Production build"
	@echo "  make fix    - Auto-fix lint + format"
	@echo "  make check  - Run all checks"
	@echo "  make help   - Show this help"
	@echo ""
