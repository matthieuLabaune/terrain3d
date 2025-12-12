import { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface TerrainViewerProps {
    heightmap: number[][] | null;
    wireframe?: boolean;
    autoRotate?: boolean;
    showBase?: boolean;
    baseThickness?: number;
}

function TerrainMesh({
    heightmap,
    wireframe,
    showBase = true,
    baseThickness = 0.5,
}: {
    heightmap: number[][];
    wireframe: boolean;
    showBase?: boolean;
    baseThickness?: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const baseMeshRef = useRef<THREE.Mesh>(null);

    const { geometry, minY, maxY, size } = useMemo(() => {
        const rows = heightmap.length;
        const cols = heightmap[0].length;
        const size = 10;
        const cellSize = size / Math.max(rows, cols);

        // Find min/max for normalization
        let minElev = Infinity;
        let maxElev = -Infinity;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                minElev = Math.min(minElev, heightmap[i][j]);
                maxElev = Math.max(maxElev, heightmap[i][j]);
            }
        }
        const elevRange = maxElev - minElev || 1;

        // Create geometry
        const geo = new THREE.PlaneGeometry(size, size, cols - 1, rows - 1);
        geo.rotateX(-Math.PI / 2);

        const positions = geo.attributes.position.array as Float32Array;
        const colors = new Float32Array(positions.length);

        // Color gradient
        const colorLow = new THREE.Color(0x1e40af);
        const colorMid1 = new THREE.Color(0x16a34a);
        const colorMid2 = new THREE.Color(0xeab308);
        const colorHigh = new THREE.Color(0xdc2626);
        const colorSnow = new THREE.Color(0xffffff);

        let minY = Infinity;
        let maxY = -Infinity;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const idx = i * cols + j;
                const elev = heightmap[rows - 1 - i][j];
                const normalizedElev = (elev - minElev) / elevRange;

                const y = normalizedElev * 3;
                positions[idx * 3 + 1] = y;
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);

                let color: THREE.Color;
                if (normalizedElev < 0.25) {
                    color = colorLow.clone().lerp(colorMid1, normalizedElev * 4);
                } else if (normalizedElev < 0.5) {
                    color = colorMid1.clone().lerp(colorMid2, (normalizedElev - 0.25) * 4);
                } else if (normalizedElev < 0.75) {
                    color = colorMid2.clone().lerp(colorHigh, (normalizedElev - 0.5) * 4);
                } else if (normalizedElev < 0.9) {
                    color = colorHigh.clone().lerp(colorSnow, (normalizedElev - 0.75) * 6.67);
                } else {
                    color = colorSnow.clone();
                }

                colors[idx * 3] = color.r;
                colors[idx * 3 + 1] = color.g;
                colors[idx * 3 + 2] = color.b;
            }
        }

        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        return { geometry: geo, minY, maxY, size };
    }, [heightmap]);

    // Create base geometry (box under the terrain)
    const baseGeometry = useMemo(() => {
        if (!showBase) return null;
        
        const baseHeight = baseThickness;
        const baseY = minY - baseHeight / 2;
        
        // Create a box for the base
        const geo = new THREE.BoxGeometry(size, baseHeight, size);
        
        return { geometry: geo, positionY: baseY };
    }, [showBase, baseThickness, minY, size]);

    return (
        <group>
            {/* Terrain surface */}
            <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial
                    vertexColors
                    wireframe={wireframe}
                    side={THREE.DoubleSide}
                    flatShading={false}
                />
            </mesh>

            {/* Base/socle */}
            {showBase && baseGeometry && (
                <mesh 
                    ref={baseMeshRef} 
                    geometry={baseGeometry.geometry}
                    position={[0, baseGeometry.positionY, 0]}
                    castShadow 
                    receiveShadow
                >
                    <meshStandardMaterial
                        color="#475569"
                        wireframe={wireframe}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Side walls to connect terrain to base */}
            {showBase && <SideWalls heightmap={heightmap} minY={minY} baseThickness={baseThickness} size={size} wireframe={wireframe} />}
        </group>
    );
}

function SideWalls({
    heightmap,
    minY,
    baseThickness,
    size,
    wireframe,
}: {
    heightmap: number[][];
    minY: number;
    baseThickness: number;
    size: number;
    wireframe: boolean;
}) {
    const geometry = useMemo(() => {
        const rows = heightmap.length;
        const cols = heightmap[0].length;
        const halfSize = size / 2;
        const baseY = minY - baseThickness;

        let minElev = Infinity;
        let maxElev = -Infinity;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                minElev = Math.min(minElev, heightmap[i][j]);
                maxElev = Math.max(maxElev, heightmap[i][j]);
            }
        }
        const elevRange = maxElev - minElev || 1;

        const getY = (i: number, j: number) => {
            const elev = heightmap[rows - 1 - i][j];
            return ((elev - minElev) / elevRange) * 3;
        };

        const vertices: number[] = [];
        const indices: number[] = [];
        let vertexIndex = 0;

        const addQuad = (
            x1: number, y1: number, z1: number,
            x2: number, y2: number, z2: number,
            x3: number, y3: number, z3: number,
            x4: number, y4: number, z4: number
        ) => {
            vertices.push(x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4);
            indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
            indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);
            vertexIndex += 4;
        };

        // Front wall (i = 0)
        for (let j = 0; j < cols - 1; j++) {
            const x1 = -halfSize + (j / (cols - 1)) * size;
            const x2 = -halfSize + ((j + 1) / (cols - 1)) * size;
            const z = halfSize;
            const y1 = getY(0, j);
            const y2 = getY(0, j + 1);
            addQuad(x1, y1, z, x2, y2, z, x2, baseY, z, x1, baseY, z);
        }

        // Back wall (i = rows-1)
        for (let j = 0; j < cols - 1; j++) {
            const x1 = -halfSize + (j / (cols - 1)) * size;
            const x2 = -halfSize + ((j + 1) / (cols - 1)) * size;
            const z = -halfSize;
            const y1 = getY(rows - 1, j);
            const y2 = getY(rows - 1, j + 1);
            addQuad(x2, y2, z, x1, y1, z, x1, baseY, z, x2, baseY, z);
        }

        // Left wall (j = 0)
        for (let i = 0; i < rows - 1; i++) {
            const z1 = halfSize - (i / (rows - 1)) * size;
            const z2 = halfSize - ((i + 1) / (rows - 1)) * size;
            const x = -halfSize;
            const y1 = getY(i, 0);
            const y2 = getY(i + 1, 0);
            addQuad(x, y2, z2, x, y1, z1, x, baseY, z1, x, baseY, z2);
        }

        // Right wall (j = cols-1)
        for (let i = 0; i < rows - 1; i++) {
            const z1 = halfSize - (i / (rows - 1)) * size;
            const z2 = halfSize - ((i + 1) / (rows - 1)) * size;
            const x = halfSize;
            const y1 = getY(i, cols - 1);
            const y2 = getY(i + 1, cols - 1);
            addQuad(x, y1, z1, x, y2, z2, x, baseY, z2, x, baseY, z1);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        return geo;
    }, [heightmap, minY, baseThickness, size]);

    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
                color="#64748b"
                wireframe={wireframe}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export default function TerrainViewer({
    heightmap,
    wireframe = false,
    autoRotate = false,
    showBase = true,
    baseThickness = 0.5,
}: TerrainViewerProps) {
    if (!heightmap) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-lg">
                <div className="text-center text-slate-400">
                    <svg
                        className="w-16 h-16 mx-auto mb-4 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="m8 3 4 8 5-5 5 15H2L8 3z"
                        />
                    </svg>
                    <p className="text-lg font-medium">Selectionnez une region</p>
                    <p className="text-sm">pour visualiser le terrain en 3D</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-lg overflow-hidden">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
                <OrbitControls 
                    enableDamping 
                    dampingFactor={0.05} 
                    autoRotate={autoRotate}
                    autoRotateSpeed={0.5}
                />

                {/* Lighting */}
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={1}
                    castShadow
                    shadow-mapSize-width={2048}
                    shadow-mapSize-height={2048}
                />
                <directionalLight position={[-5, 5, -5]} intensity={0.3} />

                {/* Terrain with base */}
                <TerrainMesh 
                    heightmap={heightmap} 
                    wireframe={wireframe} 
                    showBase={showBase}
                    baseThickness={baseThickness}
                />

                {/* Ground reference */}
                <gridHelper args={[20, 20, '#374151', '#1f2937']} position={[0, -1, 0]} />
            </Canvas>
        </div>
    );
}
