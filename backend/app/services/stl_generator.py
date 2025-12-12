"""
STL Generator Service - Converts heightmap to printable STL mesh
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

        # Generate vertices for the top surface
        vertices, faces = STLGenerator._create_terrain_mesh(
            z_data, x_scale, y_scale
        )

        if add_base:
            # Add base and side walls
            base_z = -base_thickness
            base_vertices, base_faces = STLGenerator._create_base_mesh(
                z_data, x_scale, y_scale, base_z
            )

            # Combine meshes
            offset = len(vertices)
            base_faces = base_faces + offset
            vertices = np.vstack([vertices, base_vertices])
            faces = np.vstack([faces, base_faces])

        # Create STL mesh
        stl_data = STLGenerator._create_stl_binary(vertices, faces)

        return stl_data

    @staticmethod
    def _create_terrain_mesh(
        z_data: np.ndarray,
        x_scale: float,
        y_scale: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create vertices and faces for the terrain surface"""
        rows, cols = z_data.shape

        # Create vertices
        vertices = []
        for i in range(rows):
            for j in range(cols):
                x = j * x_scale
                y = (rows - 1 - i) * y_scale  # Flip Y for correct orientation
                z = z_data[i, j]
                vertices.append([x, y, z])

        vertices = np.array(vertices)

        # Create faces (two triangles per grid cell)
        faces = []
        for i in range(rows - 1):
            for j in range(cols - 1):
                # Vertex indices
                v0 = i * cols + j
                v1 = i * cols + (j + 1)
                v2 = (i + 1) * cols + j
                v3 = (i + 1) * cols + (j + 1)

                # Two triangles per cell
                faces.append([v0, v2, v1])  # First triangle
                faces.append([v1, v2, v3])  # Second triangle

        faces = np.array(faces)

        return vertices, faces

    @staticmethod
    def _create_base_mesh(
        z_data: np.ndarray,
        x_scale: float,
        y_scale: float,
        base_z: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create vertices and faces for base and side walls"""
        rows, cols = z_data.shape
        vertices = []
        faces = []

        # Bottom face vertices
        for i in range(rows):
            for j in range(cols):
                x = j * x_scale
                y = (rows - 1 - i) * y_scale
                vertices.append([x, y, base_z])

        base_vertex_start = 0

        # Bottom face triangles (reversed winding for outward normals)
        for i in range(rows - 1):
            for j in range(cols - 1):
                v0 = base_vertex_start + i * cols + j
                v1 = base_vertex_start + i * cols + (j + 1)
                v2 = base_vertex_start + (i + 1) * cols + j
                v3 = base_vertex_start + (i + 1) * cols + (j + 1)

                faces.append([v0, v1, v2])  # Reversed winding
                faces.append([v1, v3, v2])

        # Side walls
        # We need to reference the top surface vertices (indices 0 to rows*cols-1)
        # and bottom vertices (starting at base_vertex_start)

        # Front wall (i = 0)
        side_vertex_start = len(vertices)
        for j in range(cols):
            x = j * x_scale
            y = (rows - 1) * y_scale
            # Top vertex from terrain
            z_top = z_data[0, j]
            vertices.append([x, y, z_top])
            # Bottom vertex
            vertices.append([x, y, base_z])

        for j in range(cols - 1):
            v0 = side_vertex_start + j * 2      # Current top
            v1 = side_vertex_start + j * 2 + 1  # Current bottom
            v2 = side_vertex_start + (j + 1) * 2      # Next top
            v3 = side_vertex_start + (j + 1) * 2 + 1  # Next bottom
            faces.append([v0, v1, v2])
            faces.append([v1, v3, v2])

        # Back wall (i = rows-1)
        side_vertex_start = len(vertices)
        for j in range(cols):
            x = j * x_scale
            y = 0
            z_top = z_data[rows - 1, j]
            vertices.append([x, y, z_top])
            vertices.append([x, y, base_z])

        for j in range(cols - 1):
            v0 = side_vertex_start + j * 2
            v1 = side_vertex_start + j * 2 + 1
            v2 = side_vertex_start + (j + 1) * 2
            v3 = side_vertex_start + (j + 1) * 2 + 1
            faces.append([v0, v2, v1])  # Reversed for outward normal
            faces.append([v1, v2, v3])

        # Left wall (j = 0)
        side_vertex_start = len(vertices)
        for i in range(rows):
            x = 0
            y = (rows - 1 - i) * y_scale
            z_top = z_data[i, 0]
            vertices.append([x, y, z_top])
            vertices.append([x, y, base_z])

        for i in range(rows - 1):
            v0 = side_vertex_start + i * 2
            v1 = side_vertex_start + i * 2 + 1
            v2 = side_vertex_start + (i + 1) * 2
            v3 = side_vertex_start + (i + 1) * 2 + 1
            faces.append([v0, v2, v1])
            faces.append([v1, v2, v3])

        # Right wall (j = cols-1)
        side_vertex_start = len(vertices)
        for i in range(rows):
            x = (cols - 1) * x_scale
            y = (rows - 1 - i) * y_scale
            z_top = z_data[i, cols - 1]
            vertices.append([x, y, z_top])
            vertices.append([x, y, base_z])

        for i in range(rows - 1):
            v0 = side_vertex_start + i * 2
            v1 = side_vertex_start + i * 2 + 1
            v2 = side_vertex_start + (i + 1) * 2
            v3 = side_vertex_start + (i + 1) * 2 + 1
            faces.append([v0, v1, v2])
            faces.append([v1, v3, v2])

        return np.array(vertices), np.array(faces)

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
        # Each grid cell creates 2 triangles
        terrain_triangles = 2 * (resolution - 1) ** 2

        # Base adds bottom + 4 sides
        if add_base:
            base_triangles = terrain_triangles  # Bottom face
            side_triangles = 4 * 2 * (resolution - 1)  # 4 sides
            total_triangles = terrain_triangles + base_triangles + side_triangles
        else:
            total_triangles = terrain_triangles

        # Binary STL: 80 header + 4 bytes count + 50 bytes per triangle
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
