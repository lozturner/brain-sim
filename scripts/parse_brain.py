"""
Parse the FreeSurfer brain OBJ and split it into named anatomical regions.
Each region becomes a separate OBJ file + generates a JSON manifest with
region names, centroids, bounding boxes, vertex counts, and connectivity.
This data feeds directly into the Three.js brain simulator.
"""
import trimesh
import numpy as np
import json
import os

OBJ_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'brain.obj')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'regions')
MANIFEST_PATH = os.path.join(os.path.dirname(__file__), '..', 'src', 'regionData.json')

os.makedirs(OUT_DIR, exist_ok=True)

# ─── ATLAS: region centres in FreeSurfer MNI space ──────────────
# These are approximate MNI coordinates for each brain region.
# The OBJ uses FreeSurfer surface coordinates which are close to MNI.
# X = left(-) to right(+), Y = posterior(-) to anterior(+), Z = inferior(-) to superior(+)
ATLAS = {
    # Frontal Lobe
    "frontal_pole":          {"centre": [ 0,  65,  5], "radius": 20, "lobe": "Frontal", "desc": "Planning, personality, decision making"},
    "superior_frontal_L":    {"centre": [-15, 40, 45], "radius": 25, "lobe": "Frontal", "desc": "Working memory, self-awareness"},
    "superior_frontal_R":    {"centre": [ 15, 40, 45], "radius": 25, "lobe": "Frontal", "desc": "Working memory, self-awareness"},
    "middle_frontal_L":      {"centre": [-35, 35, 30], "radius": 22, "lobe": "Frontal", "desc": "Attention, executive function"},
    "middle_frontal_R":      {"centre": [ 35, 35, 30], "radius": 22, "lobe": "Frontal", "desc": "Attention, executive function"},
    "inferior_frontal_L":    {"centre": [-48, 25, 10], "radius": 18, "lobe": "Frontal", "desc": "Broca's area - speech production"},
    "inferior_frontal_R":    {"centre": [ 48, 25, 10], "radius": 18, "lobe": "Frontal", "desc": "Prosody, emotional language"},
    "precentral_gyrus_L":    {"centre": [-35,  -8, 55], "radius": 22, "lobe": "Frontal", "desc": "Primary motor cortex (left body)"},
    "precentral_gyrus_R":    {"centre": [ 35,  -8, 55], "radius": 22, "lobe": "Frontal", "desc": "Primary motor cortex (right body)"},
    "orbitofrontal_L":       {"centre": [-20, 50,-15], "radius": 18, "lobe": "Frontal", "desc": "Reward, emotion, social behaviour"},
    "orbitofrontal_R":       {"centre": [ 20, 50,-15], "radius": 18, "lobe": "Frontal", "desc": "Reward, emotion, social behaviour"},

    # Parietal Lobe
    "postcentral_gyrus_L":   {"centre": [-38, -25, 55], "radius": 22, "lobe": "Parietal", "desc": "Primary somatosensory cortex"},
    "postcentral_gyrus_R":   {"centre": [ 38, -25, 55], "radius": 22, "lobe": "Parietal", "desc": "Primary somatosensory cortex"},
    "superior_parietal_L":   {"centre": [-22, -55, 55], "radius": 22, "lobe": "Parietal", "desc": "Spatial orientation, attention"},
    "superior_parietal_R":   {"centre": [ 22, -55, 55], "radius": 22, "lobe": "Parietal", "desc": "Spatial orientation, attention"},
    "inferior_parietal_L":   {"centre": [-48, -45, 40], "radius": 22, "lobe": "Parietal", "desc": "Language, math, body image"},
    "inferior_parietal_R":   {"centre": [ 48, -45, 40], "radius": 22, "lobe": "Parietal", "desc": "Spatial awareness, attention"},
    "precuneus_L":           {"centre": [-8,  -60, 40], "radius": 20, "lobe": "Parietal", "desc": "Self-reflection, consciousness"},
    "precuneus_R":           {"centre": [ 8,  -60, 40], "radius": 20, "lobe": "Parietal", "desc": "Self-reflection, consciousness"},

    # Temporal Lobe
    "superior_temporal_L":   {"centre": [-55, -15,  0], "radius": 22, "lobe": "Temporal", "desc": "Wernicke's area - language comprehension"},
    "superior_temporal_R":   {"centre": [ 55, -15,  0], "radius": 22, "lobe": "Temporal", "desc": "Music, prosody, voice recognition"},
    "middle_temporal_L":     {"centre": [-58, -30,-10], "radius": 22, "lobe": "Temporal", "desc": "Semantic processing, reading"},
    "middle_temporal_R":     {"centre": [ 58, -30,-10], "radius": 22, "lobe": "Temporal", "desc": "Face recognition, visual processing"},
    "inferior_temporal_L":   {"centre": [-50, -40,-20], "radius": 20, "lobe": "Temporal", "desc": "Object recognition, visual memory"},
    "inferior_temporal_R":   {"centre": [ 50, -40,-20], "radius": 20, "lobe": "Temporal", "desc": "Object recognition, visual memory"},
    "temporal_pole_L":       {"centre": [-35, 15, -30], "radius": 16, "lobe": "Temporal", "desc": "Emotion, social cognition"},
    "temporal_pole_R":       {"centre": [ 35, 15, -30], "radius": 16, "lobe": "Temporal", "desc": "Emotion, social cognition"},
    "fusiform_gyrus_L":      {"centre": [-35, -50,-18], "radius": 18, "lobe": "Temporal", "desc": "Face and word recognition"},
    "fusiform_gyrus_R":      {"centre": [ 35, -50,-18], "radius": 18, "lobe": "Temporal", "desc": "Face and word recognition"},

    # Occipital Lobe
    "cuneus_L":              {"centre": [-8,  -85, 20], "radius": 18, "lobe": "Occipital", "desc": "Primary visual cortex (upper field)"},
    "cuneus_R":              {"centre": [ 8,  -85, 20], "radius": 18, "lobe": "Occipital", "desc": "Primary visual cortex (upper field)"},
    "lingual_gyrus_L":       {"centre": [-12, -75, -5], "radius": 18, "lobe": "Occipital", "desc": "Visual processing, colour perception"},
    "lingual_gyrus_R":       {"centre": [ 12, -75, -5], "radius": 18, "lobe": "Occipital", "desc": "Visual processing, colour perception"},
    "lateral_occipital_L":   {"centre": [-38, -80, 10], "radius": 20, "lobe": "Occipital", "desc": "Object recognition, motion detection"},
    "lateral_occipital_R":   {"centre": [ 38, -80, 10], "radius": 20, "lobe": "Occipital", "desc": "Object recognition, motion detection"},
    "calcarine_L":           {"centre": [-8,  -80,  5], "radius": 15, "lobe": "Occipital", "desc": "Primary visual cortex V1"},
    "calcarine_R":           {"centre": [ 8,  -80,  5], "radius": 15, "lobe": "Occipital", "desc": "Primary visual cortex V1"},

    # Cingulate / Limbic
    "anterior_cingulate_L":  {"centre": [-5,  35, 15], "radius": 18, "lobe": "Limbic", "desc": "Error detection, emotion, pain"},
    "anterior_cingulate_R":  {"centre": [ 5,  35, 15], "radius": 18, "lobe": "Limbic", "desc": "Error detection, emotion, pain"},
    "posterior_cingulate_L": {"centre": [-5, -40, 30], "radius": 16, "lobe": "Limbic", "desc": "Memory, default mode network"},
    "posterior_cingulate_R": {"centre": [ 5, -40, 30], "radius": 16, "lobe": "Limbic", "desc": "Memory, default mode network"},
    "insula_L":              {"centre": [-38,   5,  0], "radius": 16, "lobe": "Limbic", "desc": "Interoception, empathy, disgust"},
    "insula_R":              {"centre": [ 38,   5,  0], "radius": 16, "lobe": "Limbic", "desc": "Interoception, empathy, disgust"},

    # Cerebellum
    "cerebellum_L":          {"centre": [-25, -65,-35], "radius": 28, "lobe": "Cerebellum", "desc": "Motor coordination, balance, timing"},
    "cerebellum_R":          {"centre": [ 25, -65,-35], "radius": 28, "lobe": "Cerebellum", "desc": "Motor coordination, balance, timing"},
    "cerebellar_vermis":     {"centre": [ 0,  -65,-30], "radius": 15, "lobe": "Cerebellum", "desc": "Posture, locomotion, balance"},
}

# Connectivity map (which regions connect to which)
CONNECTIVITY = {
    "frontal_pole": ["superior_frontal_L", "superior_frontal_R", "orbitofrontal_L", "orbitofrontal_R", "anterior_cingulate_L"],
    "superior_frontal_L": ["middle_frontal_L", "precentral_gyrus_L", "anterior_cingulate_L", "superior_frontal_R"],
    "superior_frontal_R": ["middle_frontal_R", "precentral_gyrus_R", "anterior_cingulate_R", "superior_frontal_L"],
    "middle_frontal_L": ["inferior_frontal_L", "precentral_gyrus_L", "inferior_parietal_L"],
    "middle_frontal_R": ["inferior_frontal_R", "precentral_gyrus_R", "inferior_parietal_R"],
    "inferior_frontal_L": ["superior_temporal_L", "insula_L", "precentral_gyrus_L"],
    "inferior_frontal_R": ["superior_temporal_R", "insula_R", "precentral_gyrus_R"],
    "precentral_gyrus_L": ["postcentral_gyrus_L", "superior_frontal_L", "cerebellum_L"],
    "precentral_gyrus_R": ["postcentral_gyrus_R", "superior_frontal_R", "cerebellum_R"],
    "orbitofrontal_L": ["temporal_pole_L", "insula_L", "anterior_cingulate_L"],
    "orbitofrontal_R": ["temporal_pole_R", "insula_R", "anterior_cingulate_R"],
    "postcentral_gyrus_L": ["precentral_gyrus_L", "superior_parietal_L", "inferior_parietal_L", "insula_L"],
    "postcentral_gyrus_R": ["precentral_gyrus_R", "superior_parietal_R", "inferior_parietal_R", "insula_R"],
    "superior_parietal_L": ["inferior_parietal_L", "precuneus_L", "lateral_occipital_L"],
    "superior_parietal_R": ["inferior_parietal_R", "precuneus_R", "lateral_occipital_R"],
    "inferior_parietal_L": ["superior_temporal_L", "middle_temporal_L", "postcentral_gyrus_L"],
    "inferior_parietal_R": ["superior_temporal_R", "middle_temporal_R", "postcentral_gyrus_R"],
    "precuneus_L": ["posterior_cingulate_L", "superior_parietal_L", "cuneus_L"],
    "precuneus_R": ["posterior_cingulate_R", "superior_parietal_R", "cuneus_R"],
    "superior_temporal_L": ["middle_temporal_L", "inferior_frontal_L", "insula_L"],
    "superior_temporal_R": ["middle_temporal_R", "inferior_frontal_R", "insula_R"],
    "middle_temporal_L": ["inferior_temporal_L", "superior_temporal_L", "fusiform_gyrus_L"],
    "middle_temporal_R": ["inferior_temporal_R", "superior_temporal_R", "fusiform_gyrus_R"],
    "inferior_temporal_L": ["fusiform_gyrus_L", "temporal_pole_L", "middle_temporal_L"],
    "inferior_temporal_R": ["fusiform_gyrus_R", "temporal_pole_R", "middle_temporal_R"],
    "temporal_pole_L": ["orbitofrontal_L", "inferior_temporal_L", "insula_L"],
    "temporal_pole_R": ["orbitofrontal_R", "inferior_temporal_R", "insula_R"],
    "fusiform_gyrus_L": ["lingual_gyrus_L", "inferior_temporal_L", "lateral_occipital_L"],
    "fusiform_gyrus_R": ["lingual_gyrus_R", "inferior_temporal_R", "lateral_occipital_R"],
    "cuneus_L": ["calcarine_L", "lingual_gyrus_L", "precuneus_L"],
    "cuneus_R": ["calcarine_R", "lingual_gyrus_R", "precuneus_R"],
    "lingual_gyrus_L": ["calcarine_L", "fusiform_gyrus_L", "cuneus_L"],
    "lingual_gyrus_R": ["calcarine_R", "fusiform_gyrus_R", "cuneus_R"],
    "lateral_occipital_L": ["fusiform_gyrus_L", "inferior_parietal_L", "middle_temporal_L"],
    "lateral_occipital_R": ["fusiform_gyrus_R", "inferior_parietal_R", "middle_temporal_R"],
    "calcarine_L": ["cuneus_L", "lingual_gyrus_L"],
    "calcarine_R": ["cuneus_R", "lingual_gyrus_R"],
    "anterior_cingulate_L": ["posterior_cingulate_L", "orbitofrontal_L", "insula_L", "anterior_cingulate_R"],
    "anterior_cingulate_R": ["posterior_cingulate_R", "orbitofrontal_R", "insula_R", "anterior_cingulate_L"],
    "posterior_cingulate_L": ["precuneus_L", "anterior_cingulate_L", "posterior_cingulate_R"],
    "posterior_cingulate_R": ["precuneus_R", "anterior_cingulate_R", "posterior_cingulate_L"],
    "insula_L": ["inferior_frontal_L", "superior_temporal_L", "anterior_cingulate_L", "orbitofrontal_L"],
    "insula_R": ["inferior_frontal_R", "superior_temporal_R", "anterior_cingulate_R", "orbitofrontal_R"],
    "cerebellum_L": ["precentral_gyrus_L", "cerebellar_vermis", "cerebellum_R"],
    "cerebellum_R": ["precentral_gyrus_R", "cerebellar_vermis", "cerebellum_L"],
    "cerebellar_vermis": ["cerebellum_L", "cerebellum_R"],
}

# Lobe colours (hex)
LOBE_COLORS = {
    "Frontal":     "#4488ff",
    "Parietal":    "#44cc88",
    "Temporal":    "#eeaa33",
    "Occipital":   "#cc44aa",
    "Limbic":      "#ff7744",
    "Cerebellum":  "#55ddaa",
}

def prettify_name(key):
    return key.replace("_L", " (Left)").replace("_R", " (Right)").replace("_", " ").title()


def main():
    print("Loading brain mesh...")
    scene = trimesh.load(OBJ_PATH, force='scene' if True else 'mesh')

    # Combine all meshes into one for vertex assignment
    if isinstance(scene, trimesh.Scene):
        meshes = list(scene.geometry.values())
        print(f"  Found {len(meshes)} sub-meshes in scene")
        combined = trimesh.util.concatenate(meshes)
    else:
        combined = scene

    verts = np.array(combined.vertices)
    faces = np.array(combined.faces)
    print(f"  Total vertices: {len(verts)}, faces: {len(faces)}")
    print(f"  Bounds: min={verts.min(axis=0)}, max={verts.max(axis=0)}")

    # ─── NORMALISE ATLAS TO MATCH MESH SPACE ────────────────────
    # The brain OBJ is normalised to roughly [-2.7, 2.7] range
    # MNI coordinates range roughly [-80, 80]
    # So we scale atlas centres to match mesh space
    mesh_range = verts.max(axis=0) - verts.min(axis=0)
    mesh_centre = (verts.max(axis=0) + verts.min(axis=0)) / 2
    mni_range = np.array([160.0, 160.0, 160.0])  # approximate MNI range
    scale_factor = mesh_range / mni_range
    print(f"  Scale factor MNI->mesh: {scale_factor}")
    print(f"  Mesh centre: {mesh_centre}")

    # ─── ASSIGN VERTICES TO REGIONS ─────────────────────────────
    atlas_centres_raw = np.array([r["centre"] for r in ATLAS.values()])
    # Scale atlas centres to mesh space
    atlas_centres = atlas_centres_raw * scale_factor + mesh_centre
    atlas_radii = np.array([r["radius"] for r in ATLAS.values()]) * np.mean(scale_factor)
    atlas_keys = list(ATLAS.keys())

    print(f"  Atlas centres in mesh space sample: {atlas_centres[0]}")
    print(f"  Atlas radii in mesh space sample: {atlas_radii[0]}")

    print("\nAssigning vertices to regions...")
    # Compute distance from each vertex to each atlas centre, normalised by radius
    # vertex_assignments[i] = index of closest region for vertex i
    # Using vectorised computation for speed

    # verts shape: (N, 3), atlas_centres shape: (R, 3)
    diffs = verts[:, np.newaxis, :] - atlas_centres[np.newaxis, :, :]  # (N, R, 3)
    dists = np.linalg.norm(diffs, axis=2)  # (N, R)

    # Normalise by radius (closer in normalised space = better match)
    normalised_dists = dists / atlas_radii[np.newaxis, :]

    vertex_assignments = np.argmin(normalised_dists, axis=1)  # (N,)

    print(f"  Vertex assignment complete")

    # ─── EXPORT EACH REGION AS SEPARATE OBJ ────────────────────
    manifest = {}

    for idx, key in enumerate(atlas_keys):
        # Find faces where ALL 3 vertices belong to this region
        face_mask = np.all(vertex_assignments[faces] == idx, axis=1)
        region_faces = faces[face_mask]

        if len(region_faces) == 0:
            print(f"  WARNING: No faces for {key}, trying partial assignment...")
            # Fallback: include faces where ANY vertex belongs to this region
            face_mask = np.any(vertex_assignments[faces] == idx, axis=1)
            region_faces = faces[face_mask]

        if len(region_faces) == 0:
            print(f"  SKIPPED: {key} (no geometry)")
            continue

        # Get unique vertices used by these faces
        unique_verts = np.unique(region_faces)
        vert_remap = {old: new for new, old in enumerate(unique_verts)}

        new_verts = verts[unique_verts]
        new_faces = np.vectorize(vert_remap.get)(region_faces)

        # Create mesh
        region_mesh = trimesh.Trimesh(vertices=new_verts, faces=new_faces)

        # Export as OBJ
        obj_path = os.path.join(OUT_DIR, f"{key}.obj")
        region_mesh.export(obj_path)

        # Compute centroid and bounding box (in original coords)
        centroid = new_verts.mean(axis=0).tolist()
        bbox_min = new_verts.min(axis=0).tolist()
        bbox_max = new_verts.max(axis=0).tolist()

        atlas_info = ATLAS[key]
        manifest[key] = {
            "name": prettify_name(key),
            "file": f"regions/{key}.obj",
            "lobe": atlas_info["lobe"],
            "desc": atlas_info["desc"],
            "centroid": [round(c, 2) for c in centroid],
            "bboxMin": [round(c, 2) for c in bbox_min],
            "bboxMax": [round(c, 2) for c in bbox_max],
            "vertexCount": len(new_verts),
            "faceCount": len(new_faces),
            "connects": CONNECTIVITY.get(key, []),
            "color": LOBE_COLORS.get(atlas_info["lobe"], "#888888"),
        }

        print(f"  {key}: {len(new_verts)} verts, {len(new_faces)} faces")

    # ─── SAVE MANIFEST ──────────────────────────────────────────
    with open(MANIFEST_PATH, 'w') as f:
        json.dump(manifest, f, indent=2)
    print(f"\nManifest saved: {MANIFEST_PATH}")
    print(f"Regions exported: {len(manifest)}")
    print(f"Total region files: {len(os.listdir(OUT_DIR))}")


if __name__ == "__main__":
    main()
