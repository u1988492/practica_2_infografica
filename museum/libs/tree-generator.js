function generateCylinder(radius, height, segments) {
    const vertices = [];
    const colors = [];
    const indices = [];
    const normals = [];

    for (let y = -height/2; y <= height/2; y += height) {
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            vertices.push(x, y, z);
            colors.push(0.6, 0.4, 0.2, 1.0);

            const nx = Math.cos(angle);
            const nz = Math.sin(angle);
            normals.push(nx, 0, nz);
        }
    }
    
    for (let i = 0; i < segments; i++) {
        const current = i;
        const next = (i + 1);
        const currentTop = current + segments + 1;
        const nextTop = next + segments + 1;
        
        indices.push(current, currentTop, next);
        indices.push(currentTop, nextTop, next);
    }
    
    const bottomCenter = vertices.length / 3;
    vertices.push(0, -height/2, 0);
    colors.push(0.6, 0.4, 0.2, 1.0);
    normals.push(0, -1, 0);
    
    const topCenter = bottomCenter + 1;
    vertices.push(0, height/2, 0);
    colors.push(0.6, 0.4, 0.2, 1.0);
    normals.push(0, 1, 0);
    
    for (let i = 0; i < segments; i++) {
        indices.push(
            bottomCenter,
            i,
            i + 1
        );
        
        indices.push(
            topCenter,
            i + segments + 1,
            i + segments + 2
        );
    }
    
    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        normals: new Float32Array(normals)
    };
}

function generateCone(radius, height, segments) {
    const vertices = [];
    const colors = [];
    const indices = [];
    const normals = [];

    vertices.push(0, height, 0);  
    colors.push(0.2, 0.6, 0.2, 1.0);
    
    const slantHeight = Math.sqrt(radius * radius + height * height);
    const nx = radius / slantHeight;
    const ny = height / slantHeight;
    normals.push(0, 1, 0);  
    
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        vertices.push(x, 0, z);  
        colors.push(0.2, 0.6, 0.2, 1.0);
        
        const normalX = Math.cos(angle) * nx;
        const normalZ = Math.sin(angle) * nx;
        normals.push(normalX, ny, normalZ);
        
        if (i < segments) {
            indices.push(
                0,
                i + 1,
                i + 2
            );
        }
    }
    
    const baseCenter = vertices.length / 3;
    vertices.push(0, 0, 0);
    colors.push(0.2, 0.6, 0.2, 1.0);
    normals.push(0, -1, 0);
    
    for (let i = 1; i <= segments; i++) {
        indices.push(
            baseCenter,
            i,
            i + 1
        );
    }
    
    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        normals: new Float32Array(normals)
    };
}

function generateTreePositions(count, groundRadius, groundScale, minDistance, fenceRadius) {
    const positions = [];
    const grid = new Map();
    const cellSize = minDistance;
    
    function getGridKey(x, z) {
        return `${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`;
    }
    
    function checkPosition(x, z) {
        const key = getGridKey(x, z);
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