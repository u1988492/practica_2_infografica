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
    const maxAttempts = 50;

    for (let i = 0; i < count; i++) {
        let position;
        let attempts = 0;

        do {
            // Random position generation within a circle
            const angle = Math.random() * Math.PI * 2; // Random angle
            const distance = fenceRadius + minDistance + Math.random() * (groundScale * 0.8 - fenceRadius - minDistance);

            const x = distance * Math.cos(angle);
            const z = distance * Math.sin(angle);

            // Calculate height based on the curved ground
            const distanceFromCenter = Math.sqrt(x * x + z * z) / groundScale;
            const theta = (Math.PI / 8) * distanceFromCenter; // Match ground curvature
            const y = groundRadius * (1 - Math.cos(theta)); // Height based on curve

            position = [x, y, z];

            // Check if the position is far enough from existing trees
            const isFarEnough = positions.every(existingPos => {
                const dx = position[0] - existingPos[0];
                const dz = position[2] - existingPos[2];
                return Math.sqrt(dx * dx + dz * dz) >= minDistance;
            });

            // Break the loop if the position is valid or maximum attempts exceeded
            if (isFarEnough || attempts >= maxAttempts) {
                positions.push(position);
                break;
            }

            attempts++;
        } while (attempts < maxAttempts);
    }

    return positions;
}

