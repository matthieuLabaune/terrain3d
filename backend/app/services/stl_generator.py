"""
STL Generator Service - Converts heightmap to printable STL mesh
Creates watertight meshes suitable for 3D printing
"""

import numpy as np
from stl import mesh as stl_mesh
from stl import Mode as StlMode
import io
from typing import Tuple


class STLGenerator:
    """Service to generate STL files from heightmap data"""

    @staticmethod
    def heightmap_to_stl(
        heightmap: np.ndarray,
        scale_xy: float = 1.0,
        scale_z: float = 1.0,
        add_base: bool = True,
        base_thickness: float = 5.0,
        model_size_mm: float = 100.0  # Target model size in mm
    ) -> bytes:
        """
        Convert a heightmap array to STL binary format

        Args:
            heightmap: 2D numpy array of elevation values
            scale_xy: Horizontal scale factor
            scale_z: Vertical scale factor (height exaggeration)
            add_base: Whether to add a solid base
            base_thickness: Thickness of the base in mm
            model_size_mm: Target model size in mm

        Returns:
            STL file as bytes
        """
        rows, cols = heightmap.shape

        # Normalize heightmap to 0-1 range and scale
        h_min = heightmap.min()
        h_max = heightmap.max()
        h_range = h_max - h_min if h_max > h_min else 1.0

        # Normalize and apply z scale
        normalized = (heightmap - h_min) / h_range
        z_data = normalized * scale_z * (model_size_mm * 0.3)  # Height is 30% of base size

        # Create XY grid
        x_scale = model_size_mm * scale_xy / cols
        y_scale = model_size_mm * scale_xy / rows

        if add_base:
            # Create complete watertight mesh with base
            vertices, faces = STLGenerator._create_watertight_mesh(
                z_data, x_scale, y_scale, base_thickness
            )
        else:
            # Create terrain mesh only (not suitable for printing)
            vertices, faces = STLGenerator._create_terrain_mesh(
                z_data, x_scale, y_scale
            )

        # Create STL mesh
        stl_data = STLGenerator._create_stl_binary(vertices, faces)

        return stl_data

    @staticmethod
    def _create_watertight_mesh(
        z_data: np.ndarray,
        x_scale: float,
        y_scale: float,
        base_thickness: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create a complete watertight mesh with:
        - Top terrain surface
        - Bottom flat surface
        - Four side walls connecting top to bottom
        
        This creates a closed manifold mesh suitable for 3D printing.
        """
        rows, cols = z_data.shape
        base_z = -base_thickness
        
        vertices = []
        faces = []
        
        # =====================================================
        # 1. CREATE ALL VERTICES
        # =====================================================
        
        # Top surface vertices (terrain) - indices 0 to (rows*cols - 1)
        for i in range(rows):
            for j in range(cols):
                x = j * x_scale
                y = (rows - 1 - i) * y_scale
                z = z_data[i, j]
                vertices.append([x, y, z])
        
        top_vertex_count = rows * cols
        
        # Bottom surface vertices - indices (rows*cols) to (2*rows*cols - 1)
        for i in range(rows):
            for j in range(cols):
                x = j * x_scale
                y = (rows - 1 - i) * y_scale
                z = base_z
                vertices.append([x, y, z])
        
        # =====================================================
        # 2. TOP SURFACE FACES (terrain) - normals pointing UP (+Z)
        # =====================================================
        for i in range(rows - 1):
            for j in range(cols - 1):
                # Vertex indices for this quad
                v00 = i * cols + j           # top-left
                v10 = i * cols + (j + 1)     # top-right
                v01 = (i + 1) * cols + j     # bottom-left
                v11 = (i + 1) * cols + (j + 1)  # bottom-right
                
                # Two triangles - counter-clockwise winding for +Z normal
                faces.append([v00, v01, v10])
                faces.append([v10, v01, v11])
        
        # =====================================================
        # 3. BOTTOM SURFACE FACES - normals pointing DOWN (-Z)
        # =====================================================
        for i in range(rows - 1):
            for j in range(cols - 1):
                # Offset by top_vertex_count for bottom vertices
                v00 = top_vertex_count + i * cols + j
                v10 = top_vertex_count + i * cols + (j + 1)
                v01 = top_vertex_count + (i + 1) * cols + j
                v11 = top_vertex_count + (i + 1) * cols + (j + 1)
                
                # Two triangles - clockwise winding for -Z normal (reversed from top)
                faces.append([v00, v10, v01])
                faces.append([v10, v11, v01])
        
        # =====================================================
        # 4. SIDE WALLS - connecting top edges to bottom edges
        # =====================================================
        
        # Front wall (i = 0, maximum Y in world space)
        # Connects top row to bottom row
        for j in range(cols - 1):
            top_left = j                      # top surface
            top_right = j + 1                 # top surface
            bot_left = top_vertex_count + j   # bottom surface
            bot_right = top_vertex_count + j + 1  # bottom surface
            
            # Normal pointing +Y (outward from front)
            faces.append([top_left, top_right, bot_left])
            faces.append([top_right, bot_right, bot_left])
        
        # Back wall (i = rows-1, minimum Y in world space)
        for j in range(cols - 1):
            row_offset = (rows - 1) * cols
            top_left = row_offset + j
            top_right = row_offset + j + 1
            bot_left = top_vertex_count + row_offset + j
            bot_right = top_vertex_count + row_offset + j + 1
            
            # Normal pointing -Y (outward from back)
            faces.append([top_left, bot_left, top_right])
            faces.append([top_right, bot_left, bot_right])
        
        # Left wall (j = 0, minimum X)
        for i in range(rows - 1):
            top_top = i * cols                    # smaller i = larger Y
            top_bottom = (i + 1) * cols           # larger i = smaller Y
            bot_top = top_vertex_count + i * cols
            bot_bottom = top_vertex_count + (i + 1) * cols
            
            # Normal pointing -X (outward from left)
            faces.append([top_top, bot_top, top_bottom])
            faces.append([top_bottom, bot_top, bot_bottom])
        
        # Right wall (j = cols-1, maximum X)
        for i in range(rows - 1):
            top_top = i * cols + (cols - 1)
            top_bottom = (i + 1) * cols + (cols - 1)
            bot_top = top_vertex_count + i * cols + (cols - 1)
            bot_bottom = top_vertex_count + (i + 1) * cols + (cols - 1)
            
            # Normal pointing +X (outward from right)
            faces.append([top_top, top_bottom, bot_top])
            faces.append([top_bottom, bot_bottom, bot_top])
        
        return np.array(vertices, dtype=np.float32), np.array(faces, dtype=np.int32)

    @staticmethod
    def _create_terrain_mesh(
        z_data: np.ndarray,
        x_scale: float,
        y_scale: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create mesh for terrain surface only (open, not watertight)"""
        rows, cols = z_data.shape
        vertices = []
        faces = []

        # Create vertex grid
        for i in range(rows):
            for j in range(cols):
                x = j * x_scale
                y = (rows - 1 - i) * y_scale
                z = z_data[i, j]
                vertices.append([x, y, z])

        # Create triangular faces
        for i in range(rows - 1):
            for j in range(cols - 1):
                v00 = i * cols + j
                v10 = i * cols + (j + 1)
                v01 = (i + 1) * cols + j
                v11 = (i + 1) * cols + (j + 1)
                
                faces.append([v00, v01, v10])
                faces.append([v10, v01, v11])

        return np.array(vertices, dtype=np.float32), np.array(faces, dtype=np.int32)

    @staticmethod
    def _create_stl_binary(vertices: np.ndarray, faces: np.ndarray) -> bytes:
        """Create binary STL from vertices and faces"""
        # Create numpy-stl mesh
        terrain_mesh = stl_mesh.Mesh(np.zeros(faces.shape[0], dtype=stl_mesh.Mesh.dtype))

        for i, face in enumerate(faces):
            for j in range(3):
                terrain_mesh.vectors[i][j] = vertices[int(face[j])]

        # Write to bytes
        buffer = io.BytesIO()
        terrain_mesh.save('mesh.stl', fh=buffer, mode=StlMode.BINARY)
        buffer.seek(0)

        return buffer.read()

    @staticmethod
    def estimate_file_size(resolution: int, add_base: bool = True) -> int:
        """Estimate STL file size in bytes"""
        # Each grid cell creates 2 triangles for terrain
        terrain_triangles = 2 * (resolution - 1) ** 2

        if add_base:
            # Bottom face has same triangle count as top
            bottom_triangles = terrain_triangles
            # Each side wall: 2 triangles per edge segment
            side_triangles = 4 * 2 * (resolution - 1)
            total_triangles = terrain_triangles + bottom_triangles + side_triangles
        else:
            total_triangles = terrain_triangles

        # Binary STL: 80 byte header + 4 bytes count + 50 bytes per triangle
        return 84 + total_triangles * 50

    @staticmethod
    def estimate_print_time(resolution: int, scale: float = 1.0) -> str:
        """Rough estimate of print time (very approximate)"""
        # Base estimate: 100mm model at 0.2mm layer height
        base_time_hours = 2  # For 128x128 at 100mm

        # Scale by resolution
        res_factor = (resolution / 128) ** 2

        # Scale by size
        size_factor = scale ** 2

        total_hours = base_time_hours * res_factor * size_factor

        if total_hours < 1:
            return f"{int(total_hours * 60)} minutes"
        else:
            return f"{total_hours:.1f} heures"
