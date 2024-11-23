function generateCylinder(radius, height, segments) {
    const vertices = [];
    const colors = [];
    const indices = [];
    let currentIndex = 0;

    // Generate vertices for top and bottom circles
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Bottom vertex
        vertices.push(x, 0, z);
        colors.push(0.45, 0.25, 0.0, 1.0); // Brown color for trunk
        
        // Top vertex
        vertices.push(x, height, z);
        colors.push(0.45, 0.25, 0.0, 1.0);
        
        if (i < segments) {
            // Create triangles for cylinder wall
            indices.push(
                currentIndex,
                currentIndex + 1,
                currentIndex + 2,
                currentIndex + 1,
                currentIndex + 3,
                currentIndex + 2
            );
            currentIndex += 2;
        }
    }

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}

function generateCone(radius, height, segments) {
    const vertices = [];
    const colors = [];
    const indices = [];
    
    // Add top vertex (tip of cone)
    vertices.push(0, height, 0);
    colors.push(0.2, 0.6, 0.2, 1.0); // Green color for leaves
    
    // Generate base vertices
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        vertices.push(x, 0, z);
        colors.push(0.2, 0.6, 0.2, 1.0);
        
        if (i < segments) {
            indices.push(
                0,
                i + 1,
                i + 2
            );
        }
    }
    
    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices)
    };
}

function generateTreePositions(count, groundRadius, groundScale, minDistance, fenceRadius) {
    const positions = [];
    const grid = new Map(); // Grid-based spatial partitioning
    const cellSize = minDistance;
    
    function getGridKey(x, z) {
        return `${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`;
    }
    
    function checkPosition(x, z) {
        const key = getGridKey(x, z);
        // Check surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const neighborKey = `${Math.floor(x/cellSize) + dx},${Math.floor(z/cellSize) + dz}`;
                if (grid.has(neighborKey)) {
                    const positions = grid.get(neighborKey);
                    for (const pos of positions) {
                        const dist = Math.sqrt(
                            Math.pow(x - pos[0], 2) + 
                            Math.pow(z - pos[2], 2)
                        );
                        if (dist < minDistance) return false;
                    }
                }
            }
        }
        return true;
    }
    
    while (positions.length < count) {
        const angle = Math.random() * Math.PI * 2;
        const distance = (fenceRadius + 5) + Math.random() * (groundScale * 0.4);
        const x = distance * Math.cos(angle);
        const z = distance * Math.sin(angle);
        
        if (checkPosition(x, z)) {
            const distanceFromCenter = Math.sqrt(x * x + z * z) / groundScale;
            const theta = (Math.PI / 8) * distanceFromCenter;
            const y = groundRadius * (1 - Math.cos(theta));
            
            const position = [x, y, z];
            positions.push(position);
            
            const key = getGridKey(x, z);
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(position);
        }
    }
    
    return positions;
}

