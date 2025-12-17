.PHONY: dev build start lint format fix clean install check typecheck help

# Default target
all: check build

# Install dependencies
install:
	npm install --legacy-peer-deps

# Development server
dev:
	npm run dev

# Production build
build:
	npm run build

# Start production server
start:
	npm run start

# Linting
lint:
	npx eslint .

# Format check (no changes)
format:
	npx prettier --check "**/*.{ts,tsx,js,jsx,json,css}"

# Fix all formatting and lint issues
fix:
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,css}"
	npx eslint --fix .

# TypeScript type checking
typecheck:
	npx tsc --noEmit

# Full check: format + lint + typecheck (format first for consistent style)
check: format lint typecheck
	@echo "✅ All checks passed!"

# Clean build artifacts
clean:
	rm -rf .next
	rm -rf node_modules/.cache

# Deep clean (removes node_modules)
clean-all: clean
	rm -rf node_modules
	rm -rf package-lock.json

# Database operations (requires running server)
db-backup:
	curl -X POST http://localhost:3000/api/db/backup

db-download:
	curl -o backup.sql http://localhost:3000/api/db/backup

# Sync script (requires ts-node)
sync-export:
	npx ts-node scripts/sync-db.ts export

sync-import:
	npx ts-node scripts/sync-db.ts import

sync-compare:
	npx ts-node scripts/sync-db.ts compare

# Help
help:
	@echo ""
	@echo "📚 Developer Journal Workspace - Web"
	@echo "======================================"
	@echo ""
	@echo "Development:"
	@echo "  make dev       - Start development server"
	@echo "  make build     - Production build"
	@echo "  make start     - Start production server"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint      - Run ESLint"
	@echo "  make format    - Check Prettier formatting"
	@echo "  make fix       - Auto-fix lint + format issues"
	@echo "  make typecheck - TypeScript type checking"
	@echo "  make check     - Run all checks (format, lint, typecheck)"
	@echo ""
	@echo "Maintenance:"
	@echo "  make install   - Install dependencies"
	@echo "  make clean     - Clean build artifacts"
	@echo "  make clean-all - Deep clean (removes node_modules)"
	@echo ""
	@echo "Database:"
	@echo "  make db-backup   - Trigger backup (needs running server)"
	@echo "  make sync-export - Export SQLite → Supabase"
	@echo "  make sync-import - Import Supabase → SQLite"
	@echo "  make sync-compare - Compare databases"
	@echo ""
