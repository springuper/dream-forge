.PHONY: dev dev-backend dev-frontend install setup stop

# Start both backend and frontend
dev:
	@echo "Starting council dev servers..."
	@echo "Backend: http://localhost:3001"
	@echo "Frontend: http://localhost:5173"
	@echo ""
	@echo "Press Ctrl+C to stop both"
	cd backend && npm run dev &
	BACKEND_PID=$$!
	cd frontend && npm run dev &
	FRONTEND_PID=$$!
	trap "kill $$BACKEND_PID $$FRONTEND_PID 2>/dev/null; exit 0" EXIT INT TERM
	wait

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