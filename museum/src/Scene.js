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
        this.roomBounds = {
            minX: -100, maxX: 100,  // Expanded bounds for larger ground
            minY: 0, maxY: 10,
            minZ: -100, maxZ: 100
        };
    }

    initialize() {
        this.initializeGround();
        this.initializeSky();
        this.initializeSun();
        this.initializeTrees();
    }

    initializeGround() {
        const segments = 32;  // Number of segments for detail
        const radius = -50;   // Large radius for subtle curvature
        const scale = 200;    // Scale of the ground plane
        
        const vertices = [];
        const colors = [];
        const indices = [];
        
        // Generate a partial dome for the ground
        for (let i = 0; i <= segments; i++) {
            // Only generate the bottom quarter of a dome
            const theta = (Math.PI / 8) * (i / segments);  // Reduced angle for subtle curve
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let j = 0; j <= segments; j++) {
                const phi = (2 * Math.PI) * (j / segments);
                // Scale x and z, keep y subtle for curvature
                const x = scale * sinTheta * Math.cos(phi);
                const y = radius * (1 - cosTheta);  // Subtle height variation
                const z = scale * sinTheta * Math.sin(phi);
                
                vertices.push(x, y, z);
                
                // Add slight color variation based on distance from center
                const distanceFromCenter = Math.sqrt(x * x + z * z) / scale;
                const gradientFactor = 1 - Math.min(distanceFromCenter * 0.3, 0.3);
                colors.push(
                    0.3 * gradientFactor,  // Darker green at edges
                    0.7 * gradientFactor,  // Darker green at edges
                    0.3 * gradientFactor,  // Darker green at edges
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
        const dome = this.generateDome(15, 32); // 15 Radius , 32 segments
        this.buffers.skyVertex = this.createBuffer(dome.vertices);
        this.buffers.skyColor = this.createBuffer(dome.colors);
        this.buffers.skyIndex = this.createIndexBuffer(dome.indices);
        this.objects.sky = dome;
    }

    initializeSun() {
        const sun = this.generateDome(5, 32); // Radius 5
        this.buffers.sunVertex = this.createBuffer(sun.vertices);
        this.buffers.sunColor = this.createBuffer(sun.colors);
        this.buffers.sunIndex = this.createIndexBuffer(sun.indices);
        this.objects.sun = sun;
        this.sunPosition = [0, 40, -30];
    }

    initializeTrees() {
        const trunk = generateCylinder(0.2, 2, 8);
        const leaves = generateCone(1, 3, 8);
        
        this.buffers.trunkVertex = this.createBuffer(trunk.vertices);
        this.buffers.trunkColor = this.createBuffer(trunk.colors);
        this.buffers.trunkIndex = this.createIndexBuffer(trunk.indices);
        
        this.buffers.leavesVertex = this.createBuffer(leaves.vertices);
        this.buffers.leavesColor = this.createBuffer(leaves.colors);
        this.buffers.leavesIndex = this.createIndexBuffer(leaves.indices);
        
        this.objects.trunk = trunk;
        this.objects.leaves = leaves;
        
        // Generate tree positions with height adjustment
        this.treePositions = generateTreePositions(50, -50, 200, 5, this.fenceRadius); // Matches your ground curvature parameters

    }

    initializeFence() {
        const fenceRadius = 80; // Radius of the fence
        const fenceHeight = 3; // Height of the fence
        const segments = 64; // Smoothness of the circular fence
    
        const fence = generateCircularFence(fenceRadius, fenceHeight, segments);
        this.buffers.fenceVertex = this.createBuffer(fence.vertices);
        this.buffers.fenceColor = this.createBuffer(fence.colors);
        this.buffers.fenceIndex = this.createIndexBuffer(fence.indices);
        this.objects.fence = fence;
    
        this.fenceRadius = fenceRadius; // Store for tree placement logic
    }
    

    createBuffer(data) {
        const buffer = this.gl.createBuffer();
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
    
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
    
            // Bottom and top vertices for the fence
            vertices.push(x, 0, z); // Bottom
            colors.push(0.4, 0.4, 0.4, 1.0); // Gray color
            vertices.push(x, height, z); // Top
            colors.push(0.4, 0.4, 0.4, 1.0);
    
            // Create indices for quad strips
            if (i < segments) {
                const baseIndex = i * 2;
                indices.push(
                    baseIndex, baseIndex + 1, baseIndex + 2,
                    baseIndex + 1, baseIndex + 3, baseIndex + 2
                );
            }
        }
    
        return {
            vertices: new Float32Array(vertices),
            colors: new Float32Array(colors),
            indices: new Uint16Array(indices)
        };
    }    

    render(shader, mvpMatrix) {
        this.renderGround(shader, mvpMatrix);
        this.renderSky(shader, mvpMatrix);
        this.renderSun(shader, mvpMatrix);
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
        mat4.translate(modelMatrix, modelMatrix, this.sunPosition);
        let sunMVP = mat4.create();
        mat4.multiply(sunMVP, mvpMatrix, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sunVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sunColor);
        shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.sunIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', sunMVP);
        
        this.gl.drawElements(this.gl.TRIANGLES, this.objects.sun.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    renderTrees(shader, mvpMatrix) {
        this.treePositions.forEach(position => {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, position);
            
            const treeMVP = mat4.create();
            mat4.multiply(treeMVP, mvpMatrix, modelMatrix);
            
            // Draw trunk
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.trunkVertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.trunkColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.trunkIndex);
            shader.setUniformMatrix4fv('uModelViewProjection', treeMVP);
            this.gl.drawElements(this.gl.TRIANGLES, this.objects.trunk.indices.length, this.gl.UNSIGNED_SHORT, 0);
    
            // Draw leaves
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.leavesVertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.leavesColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.leavesIndex);
            shader.setUniformMatrix4fv('uModelViewProjection', treeMVP);
            this.gl.drawElements(this.gl.TRIANGLES, this.objects.leaves.indices.length, this.gl.UNSIGNED_SHORT, 0);
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