.PHONY: dev dev-backend dev-frontend install setup stop

# Start both backend and frontend
dev:
	@echo "Starting council dev servers..."
	@echo "Backend: http://localhost:3001"
	@echo "Frontend: http://localhost:5173"
	@echo ""
	cd backend && npm run dev &
	cd frontend && npm run dev &

# Stop all services
stop:
	@pkill -f "tsx.*backend" 2>/dev/null; \
	pkill -f "tsx.*index" 2>/dev/null; \
	pkill -f "vite" 2>/dev/null; \
	pkill -f "node.*council" 2>/dev/null; \
	lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null; \
	lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null; \
	echo "All processes stopped"

# Start backend only
dev-backend:
	cd backend && npm run dev

# Start frontend only
dev-frontend:
	cd frontend && npm run dev

# Install all dependencies
install:
	cd backend && npm install
	cd frontend && npm install

# Setup: install deps + start podman
setup:
	podman-compose up -d
	$(MAKE) install

# Stop all services
stop:
	pkill -f "tsx.*backend" || true
	pkill -f "vite.*frontend" || true
	pkill -f "node.*backend" || true
	pkill -f "node.*frontend" || true
	@echo "Services stopped"