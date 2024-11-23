export default class Scene {
    constructor(gl) {
        this.gl = gl;
        this.objects = {
            ground: null,
            sky: null,
            sun: null,
            trees: null
        };
        this.buffers = {};
        this.disposed = false;
        this.fenceRadius = 40;
        this.treeVariations = [];
        this.treeBuffers = [];
        this.treePositions = [];
    }

    dispose() {
        if (this.disposed) return;
        
        // Delete all WebGL buffers
        Object.values(this.buffers).forEach(buffer => {
            if (buffer) this.gl.deleteBuffer(buffer);
        });
        
        // Delete tree buffers
        if (this.treeBuffers) {
            this.treeBuffers.forEach(variation => {
                Object.values(variation.trunk).forEach(buffer => {
                    if (buffer) this.gl.deleteBuffer(buffer);
                });
                Object.values(variation.leaves).forEach(buffer => {
                    if (buffer) this.gl.deleteBuffer(buffer);
                });
            });
        }
        
        // Clear references
        this.buffers = {};
        this.objects = {};
        this.treeBuffers = null;
        this.treePositions = null;
        this.disposed = true;
    }

    initialize() {
        this.initializeGround();
        this.initializeSky();
        this.initializeSun();
        this.initializeFence();  // Add this line
        this.initializeTrees();
    }

    initializeGround() {
        const segments = 32;
        const radius = -50;
        const scale = 200;
        
        const vertices = [];
        const colors = [];
        const indices = [];
        
        // Generate a partial dome for the ground
        for (let i = 0; i <= segments; i++) {
            const theta = (Math.PI / 8) * (i / segments);
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let j = 0; j <= segments; j++) {
                const phi = (2 * Math.PI) * (j / segments);
                const x = scale * sinTheta * Math.cos(phi);
                const y = radius * (1 - cosTheta);
                const z = scale * sinTheta * Math.sin(phi);
                
                vertices.push(x, y, z);
                
                // Add slight color variation based on distance from center
                const distanceFromCenter = Math.sqrt(x * x + z * z) / scale;
                const gradientFactor = 1 - Math.min(distanceFromCenter * 0.3, 0.3);
                colors.push(
                    0.3 * gradientFactor,
                    0.7 * gradientFactor,
                    0.3 * gradientFactor,
                    1.0
                );
            }
        }

        // Generate indices for triangles
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const first = i * (segments + 1) + j;
                const second = first + segments + 1;
                
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        this.groundParams = { radius, scale, segments }; // Store for height calculations
        
        this.buffers.groundVertex = this.createBuffer(new Float32Array(vertices));
        this.buffers.groundColor = this.createBuffer(new Float32Array(colors));
        this.buffers.groundIndex = this.createIndexBuffer(new Uint16Array(indices));
        this.objects.ground = {
            vertices: vertices,
            colors: colors,
            indices: indices
        };
    }

    initializeSky() {
        const skyRadius = 200;  // Keep large radius
        const segments = 64;
        const vertices = [];
        const colors = [];
        const indices = [];
        
        // Offset the sky dome to be centered at camera height
        const skyOffset = 1.5; // Match initial camera height
        
        // Generate vertices for full dome, starting from below horizon
        for (let i = 0; i <= segments/2; i++) {
            // Adjust latitude range to start from below horizon
            const lat = ((i * Math.PI) / segments) - Math.PI/6; // Start from -30 degrees
            const sinLat = Math.sin(lat);
            const cosLat = Math.cos(lat);
            
            for (let j = 0; j <= segments; j++) {
                const lon = (j * 2 * Math.PI) / segments;
                const sinLon = Math.sin(lon);
                const cosLon = Math.cos(lon);
                
                // Calculate vertex position with offset
                const x = skyRadius * cosLat * cosLon;
                const y = skyRadius * sinLat + skyOffset;
                const z = skyRadius * cosLat * sinLon;
                
                vertices.push(x, y, z);
                
                // Create gradient from horizon to zenith
                const heightFactor = (sinLat + 1) / 2; // Normalize height factor to [0,1]
                colors.push(
                    0.6 + (0.2 * heightFactor),
                    0.7 + (0.2 * heightFactor),
                    0.9 + (0.1 * heightFactor),
                    1.0
                );
            }
        }
        
        // Generate indices for triangles
        for (let i = 0; i < segments/2; i++) {
            for (let j = 0; j < segments; j++) {
                const first = i * (segments + 1) + j;
                const second = first + segments + 1;
                
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        
        this.buffers.skyVertex = this.createBuffer(new Float32Array(vertices));
        this.buffers.skyColor = this.createBuffer(new Float32Array(colors));
        this.buffers.skyIndex = this.createIndexBuffer(new Uint16Array(indices));
        this.objects.sky = {
            vertices: vertices,
            colors: colors,
            indices: indices
        };
    }

    initializeSun() {
        const sunRadius = 8;    // Larger sun
        const segments = 32;    // Smooth circle
        const vertices = [];
        const colors = [];
        const indices = [];
        
        // Generate sun disc
        vertices.push(0, 0, 0);  // Center vertex
        colors.push(1.0, 0.9, 0.2, 1.0);  // Bright yellow center
        
        for (let i = 0; i <= segments; i++) {
            const angle = (i * 2 * Math.PI) / segments;
            const x = Math.cos(angle) * sunRadius;
            const y = Math.sin(angle) * sunRadius;
            
            vertices.push(x, y, 0);
            colors.push(1.0, 0.7, 0.1, 1.0);  // Slightly darker yellow at edges
            
            if (i < segments) {
                indices.push(0, i + 1, i + 2);
            }
        }
        
        this.buffers.sunVertex = this.createBuffer(new Float32Array(vertices));
        this.buffers.sunColor = this.createBuffer(new Float32Array(colors));
        this.buffers.sunIndex = this.createIndexBuffer(new Uint16Array(indices));
        this.objects.sun = {
            vertices: vertices,
            colors: colors,
            indices: indices
        };
        
        // Position the sun high in the sky
        this.sunPosition = [20, 80, -60];  // Adjusted position for better visibility
    }

    initializeTrees() {
        // Generate multiple tree sizes
        this.treeVariations = [
            {
                trunk: generateCylinder(0.2, 2, 8),
                leaves: generateCone(1, 3, 8)
            },
            {
                trunk: generateCylinder(0.15, 1.5, 8),
                leaves: generateCone(0.8, 2.5, 8)
            },
            {
                trunk: generateCylinder(0.25, 2.5, 8),
                leaves: generateCone(1.2, 3.5, 8)
            }
        ];
        
        // Create buffers for each variation
        this.treeBuffers = this.treeVariations.map(variation => ({
            trunk: {
                vertex: this.createBuffer(new Float32Array(variation.trunk.vertices)),
                color: this.createBuffer(new Float32Array(variation.trunk.colors)),
                index: this.createIndexBuffer(new Uint16Array(variation.trunk.indices))
            },
            leaves: {
                vertex: this.createBuffer(new Float32Array(variation.leaves.vertices)),
                color: this.createBuffer(new Float32Array(variation.leaves.colors)),
                index: this.createIndexBuffer(new Uint16Array(variation.leaves.indices))
            }
        }));
        
        // Generate positions with variation indices
        this.treePositions = generateTreePositions(50, -50, 200, 5, this.fenceRadius)
            .map(pos => ({
                position: pos,
                variation: Math.floor(Math.random() * this.treeVariations.length)
            }));
    }

    initializeFence() {
        const fence = this.generateCircularFence(this.fenceRadius, 3, 64);
        this.buffers.fenceVertex = this.createBuffer(fence.vertices);
        this.buffers.fenceColor = this.createBuffer(fence.colors);
        this.buffers.fenceIndex = this.createIndexBuffer(fence.indices);
        this.objects.fence = fence;
    }
    

    createBuffer(data) {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create WebGL buffer');
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
        return buffer;
    }

    createIndexBuffer(data) {
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
        return buffer;
    }

    generateDome(radius, segments) {
        const vertices = [];
        const colors = [];
        const indices = [];
    
        for (let i = 0; i <= segments; i++) {
            const theta = (Math.PI / 2) * (i / segments);
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
    
            for (let j = 0; j <= segments; j++) {
                const phi = (2 * Math.PI) * (j / segments);
                const x = radius * sinTheta * Math.cos(phi);
                const y = radius * cosTheta;
                const z = radius * sinTheta * Math.sin(phi);
    
                vertices.push(x, y, z);
                colors.push(0.5, 0.7, 1.0, 1.0);
            }
        }
    
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const first = i * (segments + 1) + j;
                const second = first + segments + 1;
    
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
    
        return {
            vertices: new Float32Array(vertices),
            colors: new Float32Array(colors),
            indices: new Uint16Array(indices)
        };
    }

    generateCircularFence(radius, height, segments) {
        const vertices = [];
        const colors = [];
        const indices = [];
        const postWidth = 0.15;         // Thinner posts
        height = 1.2;                   // Keep height below camera
        segments = Math.floor(segments * 0.5);  // Reduce number of posts
        
        // Generate posts with more spacing
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Create vertices for each post (front and back faces)
            const offsetX = Math.sin(angle) * postWidth/2;
            const offsetZ = Math.cos(angle) * postWidth/2;
            
            // Front vertices
            vertices.push(
                x - offsetX, 0, z - offsetZ,      // bottom left
                x - offsetX, height, z - offsetZ,  // top left
                x + offsetX, height, z + offsetZ,  // top right
                x + offsetX, 0, z + offsetZ       // bottom right
            );
            
            // Add colors for all vertices (slightly randomize wood color)
            const colorVariation = Math.random() * 0.1;
            for (let j = 0; j < 4; j++) {
                colors.push(
                    0.55 + colorVariation,  // R
                    0.35 + colorVariation,  // G
                    0.2 + colorVariation,   // B
                    1.0
                );
            }
            
            // Add indices for post faces
            const baseIndex = i * 4;
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,     // front face
                baseIndex, baseIndex + 2, baseIndex + 3      // back face
            );
        }
        
        return {
            vertices: new Float32Array(vertices),
            colors: new Float32Array(colors),
            indices: new Uint16Array(indices)
        };
    }    

    render(shader, mvpMatrix) {
        // Enable depth testing
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LESS);
        
        // Clear both color and depth buffer
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Render sky first, with depth testing disabled
        this.gl.disable(this.gl.DEPTH_TEST);
        this.renderSky(shader, mvpMatrix);
        this.renderSun(shader, mvpMatrix);
        
        // Re-enable depth testing for other objects
        this.gl.enable(this.gl.DEPTH_TEST);
        this.renderGround(shader, mvpMatrix);
        this.renderFence(shader, mvpMatrix);
        this.renderTrees(shader, mvpMatrix);
    }

    renderGround(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let groundMVP = mat4.create();
        mat4.multiply(groundMVP, mvpMatrix, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.groundVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.groundColor);
        shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.groundIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', groundMVP);
        
        this.gl.drawElements(this.gl.TRIANGLES, this.objects.ground.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    renderSky(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let skyMVP = mat4.create();
        mat4.multiply(skyMVP, mvpMatrix, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.skyVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.skyColor);
        shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.skyIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', skyMVP);
        
        this.gl.drawElements(this.gl.TRIANGLES, this.objects.sky.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    renderSun(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        
        // Translate to sun position
        mat4.translate(modelMatrix, modelMatrix, this.sunPosition);
        
        // Make sun always face camera by calculating rotation
        const viewDir = vec3.create();
        vec3.subtract(viewDir, [0, 0, 0], this.sunPosition);
        vec3.normalize(viewDir, viewDir);
        
        const up = [0, 1, 0];
        const right = vec3.create();
        vec3.cross(right, up, viewDir);
        vec3.normalize(right, right);
        
        const newUp = vec3.create();
        vec3.cross(newUp, viewDir, right);
        
        // Build rotation matrix to face camera
        const rotationMatrix = mat4.fromValues(
            right[0], newUp[0], viewDir[0], 0,
            right[1], newUp[1], viewDir[1], 0,
            right[2], newUp[2], viewDir[2], 0,
            0, 0, 0, 1
        );
        
        mat4.multiply(modelMatrix, modelMatrix, rotationMatrix);
        
        let sunMVP = mat4.create();
        mat4.multiply(sunMVP, mvpMatrix, modelMatrix);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sunVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sunColor);
        shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.sunIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', sunMVP);
        
        // Enable blending for sun glow effect
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        this.gl.drawElements(this.gl.TRIANGLES, this.objects.sun.indices.length, this.gl.UNSIGNED_SHORT, 0);
        
        // Disable blending after rendering sun
        this.gl.disable(this.gl.BLEND);
    }

    calculateGroundHeight(x, z) {
        const radius = -50;   // Ground curve radius
        const scale = 200;    // Ground scale
        
        // Calculate distance from center
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        const normalizedDistance = distanceFromCenter / scale;
        
        // Use a more gradual curve for the ground
        const theta = (Math.PI / 8) * normalizedDistance;  // Reduced angle for subtle curve
        const y = radius * (1 - Math.cos(theta));
        
        return y;
    }

    renderTrees(shader, mvpMatrix) {
        this.treePositions.forEach(treeData => {
            const modelMatrix = mat4.create();
            const [x, _, z] = treeData.position;
            
            // Calculate correct Y position based on ground curvature
            const groundY = this.calculateGroundHeight(x, z);
            const position = [x, groundY, z];
            
            mat4.translate(modelMatrix, modelMatrix, position);
            
            const treeMVP = mat4.create();
            mat4.multiply(treeMVP, mvpMatrix, modelMatrix);
            
            // Rest of the tree rendering code remains the same
            const treeBuffers = this.treeBuffers[treeData.variation];
            
            // Draw trunk
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.trunk.vertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.trunk.color);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, treeBuffers.trunk.index);
            shader.setUniformMatrix4fv('uModelViewProjection', treeMVP);
            this.gl.drawElements(
                this.gl.TRIANGLES, 
                this.treeVariations[treeData.variation].trunk.indices.length,
                this.gl.UNSIGNED_SHORT, 
                0
            );
            
            // Draw leaves
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.leaves.vertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.leaves.color);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, treeBuffers.leaves.index);
            shader.setUniformMatrix4fv('uModelViewProjection', treeMVP);
            this.gl.drawElements(
                this.gl.TRIANGLES, 
                this.treeVariations[treeData.variation].leaves.indices.length,
                this.gl.UNSIGNED_SHORT, 
                0
            );
        });
    }
    
    renderFence(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let fenceMVP = mat4.create();
        mat4.multiply(fenceMVP, mvpMatrix, modelMatrix);
    
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.fenceVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
    
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.fenceColor);
        shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
    
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.fenceIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', fenceMVP);
    
        this.gl.drawElements(this.gl.TRIANGLES, this.objects.fence.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }
    
}