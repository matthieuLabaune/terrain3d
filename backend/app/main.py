"""
Terrain3D Backend - FastAPI Application
Converts geographic elevation data to 3D printable STL models
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .routers import terrain_router

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Terrain3D API",
    description="""
    API pour générer des modèles 3D imprimables à partir de données d'élévation géographique.

    ## Fonctionnalités

    - **Régions prédéfinies**: 12 régions françaises (Mont Blanc, Pyrénées, Corse, etc.)
    - **Génération de terrain**: Création de heightmap à partir des données SRTM
    - **Export STL**: Conversion en fichier STL binaire pour impression 3D
    - **Personnalisation**: Résolution, échelle, exagération des hauteurs

    ## Sources de données

    - SRTM (Shuttle Radar Topography Mission) - Résolution ~30m

    ## Usage

    1. Lister les régions disponibles: `GET /api/list-locations`
    2. Générer un terrain: `POST /api/terrain`
    3. Exporter en STL: `POST /api/export-stl`
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://claude.ai",
        "*"  # Allow all origins for MVP
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(terrain_router)


@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "Terrain3D API",
        "version": "1.0.0",
        "description": "Convertisseur de cartes en modèles 3D imprimables",
        "docs": "/docs",
        "endpoints": {
            "list_locations": "/api/list-locations",
            "generate_terrain": "/api/terrain",
            "export_stl": "/api/export-stl",
            "health": "/api/health"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
