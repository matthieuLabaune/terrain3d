import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface TerrainViewerProps {
    heightmap: number[][] | null;
    wireframe?: boolean;
    autoRotate?: boolean;
}

function TerrainMesh({
    heightmap,
    wireframe,
}: {
    heightmap: number[][];
    wireframe: boolean;
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    const { geometry, colorAttribute } = useMemo(() => {
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

        // Color gradient: blue (low) -> green -> yellow -> red (high)
        const colorLow = new THREE.Color(0x1e40af); // Blue
        const colorMid1 = new THREE.Color(0x16a34a); // Green
        const colorMid2 = new THREE.Color(0xeab308); // Yellow
        const colorHigh = new THREE.Color(0xdc2626); // Red
        const colorSnow = new THREE.Color(0xffffff); // White (snow)

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const idx = i * cols + j;
                const elev = heightmap[rows - 1 - i][j]; // Flip Y
                const normalizedElev = (elev - minElev) / elevRange;

                // Set height
                positions[idx * 3 + 1] = normalizedElev * 3; // Y is up after rotation

                // Set color based on elevation
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

        return { geometry: geo, colorAttribute: colors };
    }, [heightmap]);

    return (
        <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
                vertexColors
                wireframe={wireframe}
                side={THREE.DoubleSide}
                flatShading={false}
            />
        </mesh>
    );
}

function AutoRotate({ enabled }: { enabled: boolean }) {
    const controlsRef = useRef<any>(null);

    useFrame(() => {
        if (enabled && controlsRef.current) {
            controlsRef.current.autoRotate = true;
            controlsRef.current.autoRotateSpeed = 0.5;
            controlsRef.current.update();
        }
    });

    return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />;
}

export default function TerrainViewer({
    heightmap,
    wireframe = false,
    autoRotate = false,
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
                    <p className="text-lg font-medium">Sélectionnez une région</p>
                    <p className="text-sm">pour visualiser le terrain en 3D</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-lg overflow-hidden">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={50} />
                <AutoRotate enabled={autoRotate} />

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

                {/* Terrain */}
                <TerrainMesh heightmap={heightmap} wireframe={wireframe} />

                {/* Ground plane for shadow */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
                    <planeGeometry args={[20, 20]} />
                    <shadowMaterial opacity={0.3} />
                </mesh>

                {/* Grid helper */}
                <gridHelper args={[20, 20, '#374151', '#1f2937']} position={[0, -0.05, 0]} />
            </Canvas>
        </div>
    );
}
