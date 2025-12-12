# Terrain3D

🏔️ **Convertisseur de cartes en modèles 3D imprimables**

Application web permettant de générer des modèles 3D imprimables (STL) à partir de données d'élévation géographique de la France.

[![GitHub](https://img.shields.io/badge/GitHub-terrain3d-blue?logo=github)](https://github.com/matthieuLabaune/terrain3d)

## ✨ Fonctionnalités

- **12 régions françaises** : Mont Blanc, Pyrénées, Corse, Gorges du Verdon, etc.
- **Visualisation 3D temps réel** avec Three.js
- **Export STL** pour impression 3D
- **Paramètres personnalisables** :
  - Résolution (64 à 256 pixels)
  - Exagération des hauteurs
  - Ajout d'un socle
  - Épaisseur du socle

## 🚀 Démarrage rapide

### Prérequis

- Python 3.11+
- Node.js 18+
- npm ou yarn

### Installation

```bash
# Cloner le repository
git clone https://github.com/YOUR_USERNAME/terrain3d.git
cd terrain3d

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Lancement

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Ouvrez http://localhost:3000 dans votre navigateur.

## 🐳 Docker

```bash
# Lancer avec Docker Compose
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
```

## 📚 API Documentation

Une fois le backend lancé, accédez à la documentation interactive :
- Swagger UI : http://localhost:8000/docs
- ReDoc : http://localhost:8000/redoc

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/list-locations` | Liste des régions disponibles |
| POST | `/api/terrain` | Génère un terrain |
| POST | `/api/export-stl` | Exporte en fichier STL |
| GET | `/api/estimate` | Estime la taille du fichier |

## 🗺️ Régions disponibles

| Région | Type | Altitude max |
|--------|------|--------------|
| Mont Blanc | Montagne alpine | 4 808 m |
| Chamonix | Vallée de montagne | 3 842 m |
| Pyrénées (Pic du Midi) | Montagne | 2 872 m |
| Corse (Monte Cinto) | Île montagneuse | 2 706 m |
| Massif du Vercors | Plateau | 2 341 m |
| Cirque de Gavarnie | Amphithéâtre | 3 248 m |
| Mont Ventoux | Montagne isolée | 1 909 m |
| Gorges du Verdon | Canyon | 1 500 m |
| Dune du Pilat | Côtier | 110 m |
| Sainte-Victoire | Collines | 1 011 m |
| Puy de Dôme | Volcans | 1 465 m |
| Côte de Granit Rose | Côtier | 80 m |

## 🛠️ Stack technique

### Backend
- **FastAPI** - Framework web Python
- **NumPy** - Calcul numérique
- **numpy-stl** - Génération de fichiers STL
- **SciPy** - Interpolation et traitement

### Frontend
- **React 18** - Interface utilisateur
- **Three.js / React Three Fiber** - Visualisation 3D
- **Tailwind CSS** - Styles
- **Vite** - Build tool

### Sources de données
- **SRTM** (Shuttle Radar Topography Mission) - Résolution ~30m

## 📁 Structure du projet

```
terrain3d/
├── backend/
│   ├── app/
│   │   ├── main.py           # Point d'entrée FastAPI
│   │   ├── models/           # Schémas Pydantic
│   │   ├── routers/          # Endpoints API
│   │   └── services/         # Logique métier
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Composants React
│   │   ├── hooks/            # Hooks personnalisés
│   │   ├── lib/              # API client & types
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## 💡 Conseils d'impression 3D

1. **Résolution** : Commencez avec 128px pour tester, puis augmentez si besoin
2. **Exagération** : 1.5x à 2x rend les reliefs plus visibles
3. **Socle** : Recommandé pour la stabilité (5-10mm)
4. **Paramètres slicer** :
   - Couche : 0.2mm
   - Remplissage : 15-20%
   - Supports : Non nécessaires généralement

## 🔮 Roadmap

- [ ] Support Europe complète
- [ ] Intégration IGN MNT (haute résolution France)
- [ ] Export OBJ/GLB
- [ ] Couches géologiques
- [ ] Mode hors-ligne avec cache

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

Fait avec ❤️ pour les passionnés de cartographie et d'impression 3D
