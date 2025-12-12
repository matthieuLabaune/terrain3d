#!/bin/bash

# Terrain3D - Script de démarrage
# Usage: ./start.sh [backend|frontend|all]

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

start_backend() {
    echo -e "${BLUE}🚀 Démarrage du backend...${NC}"
    cd "$BACKEND_DIR"
    
    # Créer le venv si nécessaire
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}📦 Création de l'environnement virtuel...${NC}"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    else
        source venv/bin/activate
    fi
    
    echo -e "${GREEN}✓ Backend démarré sur http://localhost:8000${NC}"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

start_frontend() {
    echo -e "${BLUE}🚀 Démarrage du frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    # Installer les dépendances si nécessaire
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installation des dépendances npm...${NC}"
        npm install
    fi
    
    echo -e "${GREEN}✓ Frontend démarré sur http://localhost:5173${NC}"
    npm run dev
}

start_all() {
    echo -e "${BLUE}🌄 Terrain3D - Démarrage complet${NC}"
    echo ""
    
    # Démarrer le backend en arrière-plan
    (start_backend) &
    BACKEND_PID=$!
    
    # Attendre un peu que le backend démarre
    sleep 3
    
    # Démarrer le frontend
    start_frontend
    
    # Cleanup au Ctrl+C
    trap "kill $BACKEND_PID 2>/dev/null" EXIT
}

show_help() {
    echo "Terrain3D - Script de démarrage"
    echo ""
    echo "Usage: ./start.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  backend   Démarre uniquement le backend (API FastAPI)"
    echo "  frontend  Démarre uniquement le frontend (React/Vite)"
    echo "  all       Démarre le backend et le frontend (défaut)"
    echo "  help      Affiche cette aide"
    echo ""
    echo "URLs:"
    echo "  Backend:  http://localhost:8000"
    echo "  Frontend: http://localhost:5173"
    echo "  API Docs: http://localhost:8000/docs"
}

# Main
case "${1:-all}" in
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    all)
        start_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Option inconnue: $1"
        show_help
        exit 1
        ;;
esac
