import WireframeShader from './shaders/WireframeShader.js';
import SolidShader from './shaders/SolidShader.js';
import NormalShader from './shaders/NormalShader.js';

export default class Scene {
    // tipos de visualización
    static ViewModes = {
        SOLID: 0,
        WIREFRAME: 1,
        COMBINED: 2,
        NORMAL: 3,
    };
    
    constructor(gl) {
        this.gl = gl;
        // objetos de la escena
        this.objects = {
            ground: null,
            sky: null,
            sun: null,
            trees: null,
            birds: [],  
            seeds: []
        };

        // variables de la escena

        this.currentViewMode = Scene.ViewModes.SOLID;
        this.buffers = {};
        this.disposed = false;

        this.fenceRadius = 40;

        this.treeVariations = [];
        this.treeBuffers = [];
        this.treePositions = [];

        this.lastBirdSpawn = 0;
        this.birdSpawnInterval = 5000;
        this.birdFlockCenter = [0, 15, 0];
        this.birdFlockRadius = this.fenceRadius * 0.8;
        this.birdHeightVariance = 5;
        this.maxBirds = 20;
        this.minBirds = 3;
        this.birdGeometry = null;

        this.seedLifespan = 10000; 
        this.seedAttractRadius = 50; 
        this.birdSeekingSpeed = 0.02;
    }

    // limpieza de escena
    dispose() {
        if (this.disposed) return;
        
        // eliminar buffers de webgl
        Object.values(this.buffers).forEach(buffer => {
            if (buffer) this.gl.deleteBuffer(buffer);
        });
        
        // eliminar buffers de los arboles
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
        
        // eliminar referencias
        this.buffers = {};
        this.objects = {};
        this.treeBuffers = null;
        this.treePositions = null;
        this.disposed = true;
    }

    // funciones para crear buffers
    createBuffer(data) {
        const buffer = this.gl.createBuffer();
        if (!buffer) {
            throw new Error('No se pudo crear buffer');
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
    
    // función para crear semiesfera
    generateDome(radius, segments) {
        const vertices = [];
        const colors = [];
        const indices = [];
        const normals = [];
    
        for (let i = 0; i <= segments; i++) {
            const theta = (Math.PI / 2) * (i / segments);
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
    
            for (let j = 0; j <= segments; j++) {
                const phi = (2 * Math.PI) * (j / segments);
                const x = radius * sinTheta * Math.cos(phi);
                const y = radius * cosTheta;
                const z = radius * sinTheta * Math.sin(phi);
                
                // Calculate normals
                const length = Math.sqrt(x * x + y * y + z * z);
                normals.push(x / length, y / length, z / length);
    
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
            normals: new Float32Array(normals),
            indices: new Uint16Array(indices)
        };
    }  

    // SUELO

    // inicializar variables de suelo: vértices, normales, colores,
    initializeGround() {
        const segments = 32;
        const radius = -50;
        const scale = 300;
        
        const vertices = [];
        const colors = [];
        const indices = [];
        const normals = [];
        
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

                // calcular normales
                const nx = x / scale; 
                const ny = -(radius / Math.abs(radius));
                const nz = z / scale;
                const magnitude = Math.sqrt(nx * nx + ny * ny + nz * nz);
                normals.push(nx / magnitude, ny / magnitude, nz / magnitude);
                
                // pequeña variación de color
                const distanceFromCenter = Math.sqrt(x * x + z * z) / scale;
                const gradientFactor = 1 - Math.min(distanceFromCenter * 2, 10);
                colors.push(
                    0.3 * gradientFactor,
                    0.7 * gradientFactor,
                    0.3 * gradientFactor,
                    1.0
                );
            }
        }

        // generar índices
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const first = i * (segments + 1) + j;
                const second = first + segments + 1;
                
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        this.groundParams = { radius, scale, segments }; // guardar para cálculos sobre la altura del suelo
        
        this.buffers.groundVertex = this.createBuffer(new Float32Array(vertices));
        this.buffers.groundColor = this.createBuffer(new Float32Array(colors));
        this.buffers.groundNormal = this.createBuffer(new Float32Array(normals));
        this.buffers.groundIndex = this.createIndexBuffer(new Uint16Array(indices));
        this.objects.ground = {
            vertices: vertices,
            colors: colors,
            indices: indices,
            normals: normals
        };
    }

    // renderizar suelo según el tipo de shader aplicado
    renderGround(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let groundMVP = mat4.create();
        mat4.multiply(groundMVP, mvpMatrix, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.groundVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        if (shader === this.normalShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.groundNormal);
            shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
            shader.setUniformMatrix4fv('uModel', modelMatrix);
        }

        if (shader === this.solidShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.groundColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.groundIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', groundMVP);

        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;
        this.gl.drawElements(drawMode, this.objects.ground.indices.length, this.gl.UNSIGNED_SHORT, 0);

    }

    // CIELO

    // inicializar variables del cielo, vértices, normales, colores, e índices
    initializeSky() {
        const skyRadius = 300;  
        const segments = 64;
        const vertices = [];
        const colors = [];
        const indices = [];
        const normals = []
;        
        const skyOffset = 1.5; 

        
        // generar vértices 
        for (let i = 0; i <= segments/2; i++) {
            // latitud desde debajo del horizonte
            const lat = ((i * Math.PI) / segments) * 1.2 - Math.PI/6;
            const sinLat = Math.sin(lat);
            const cosLat = Math.cos(lat);
            
            for (let j = 0; j <= segments; j++) {
                const lon = (j * 2 * Math.PI) / segments;
                const sinLon = Math.sin(lon);
                const cosLon = Math.cos(lon);
                
                const x = skyRadius * cosLat * cosLon;
                const y = skyRadius * sinLat + skyOffset;
                const z = skyRadius * cosLat * sinLon;
                
                vertices.push(x, y, z);

                // calcular normales
                const length = Math.sqrt(x * x + y * y + z * z);
                normals.push(x / length, y / length, z / length);
                
                // degradado desde el centro
                const heightFactor = (sinLat + 1) / 2;
                colors.push(
                    0.6 + (0.2 * heightFactor),
                    0.7 + (0.2 * heightFactor),
                    0.9 + (0.1 * heightFactor),
                    1.0
                );
            }
        }
        
        // generar índices
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
        this.buffers.skyNormal = this.createBuffer(new Float32Array(normals));
        this.buffers.skyIndex = this.createIndexBuffer(new Uint16Array(indices));
        this.objects.sky = {
            vertices: vertices,
            colors: colors,
            indices: indices,
            normals: normals
        };
    }

    // renderizar cielo según el tipo de shader aplicado
    renderSky(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let skyMVP = mat4.create();
        mat4.multiply(skyMVP, mvpMatrix, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.skyVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        if (shader === this.normalShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.skyNormal);
            shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
            shader.setUniformMatrix4fv('uModel', modelMatrix);
        }

        if (shader === this.solidShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.skyColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.skyIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', skyMVP);
        
        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;

        this.gl.drawElements(drawMode, this.objects.sky.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    //ÁRBOLES

    // inicializar variables de los árboles con variaciones en el tamaño, normales de las hojas, colores, vértices, e índicies
    initializeTrees() {

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
        
        // crear buffers para cada variación de árbol
        this.treeBuffers = this.treeVariations.map(variation => ({
            trunk: {
                vertex: this.createBuffer(new Float32Array(variation.trunk.vertices)),
                color: this.createBuffer(new Float32Array(variation.trunk.colors)),
                normal: this.createBuffer(new Float32Array(variation.trunk.normals)),
                index: this.createIndexBuffer(new Uint16Array(variation.trunk.indices))
            },
            leaves: {
                vertex: this.createBuffer(new Float32Array(variation.leaves.vertices)),
                color: this.createBuffer(new Float32Array(variation.leaves.colors)),
                index: this.createIndexBuffer(new Uint16Array(variation.leaves.indices)),
                normal: this.createBuffer(new Float32Array(variation.leaves.normals))
            }
        }));
        
        // generar posiciones fuera de la valla
        this.treePositions = generateTreePositions(50, -50, 200, 5, this.fenceRadius)
            .map(pos => ({
                position: pos,
                variation: Math.floor(Math.random() * this.treeVariations.length)
            }));
    }

    // calcular altura del suelo para generar posiciones de los árboles
    calculateGroundHeight(x, z) {
        const radius = -50;  
        const scale = 200; 
        
        const distanceFromCenter = Math.sqrt(x * x + z * z);
        const normalizedDistance = distanceFromCenter / scale;
        
        const theta = (Math.PI / 8) * normalizedDistance;
        const y = radius * (1 - Math.cos(theta));
        
        return y;
    }

    // renderizar árboles según tipo de shader en uso, y posición sobre el suelo
    renderTrees(shader, mvpMatrix) {
        this.treePositions.forEach(treeData => {
            const modelMatrix = mat4.create();
            const [x, _, z] = treeData.position;
            
            const groundY = this.calculateGroundHeight(x, z);
            const position = [x, groundY, z];
            
            mat4.translate(modelMatrix, modelMatrix, position);
            
            const treeMVP = mat4.create();
            mat4.multiply(treeMVP, mvpMatrix, modelMatrix);
            
            const treeBuffers = this.treeBuffers[treeData.variation];
            
            // dibujar tronco
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.trunk.vertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            
            if (shader !== this.wireframeShader) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.trunk.color);
                shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            }
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, treeBuffers.trunk.index);
            shader.setUniformMatrix4fv('uModelViewProjection', treeMVP);

            const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;
            this.gl.drawElements(drawMode, this.treeVariations[treeData.variation].trunk.indices.length, this.gl.UNSIGNED_SHORT, 0);
            
            // dibujar hojas
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.leaves.vertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

            if (shader === this.normalShader) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.leaves.leavesNormal);
                shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
                shader.setUniformMatrix4fv('uModel', modelMatrix);
            }
            
            if (shader === this.solidShader) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.leaves.color);
                shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            }
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, treeBuffers.leaves.index);
            shader.setUniformMatrix4fv('uModelViewProjection', treeMVP);
            this.gl.drawElements(
                drawMode, 
                this.treeVariations[treeData.variation].leaves.indices.length,
                this.gl.UNSIGNED_SHORT, 
                0
            );
        });
    }

    // VALLA

    //inicializar buffers de la valla
    initializeFence() {
        const fence = this.generateCircularFence(this.fenceRadius, 3, 64);
        this.buffers.fenceVertex = this.createBuffer(fence.vertices);
        this.buffers.fenceColor = this.createBuffer(fence.colors);
        this.buffers.fenceIndex = this.createIndexBuffer(fence.indices);
        this.buffers.fenceNormal = this.createBuffer(fence.normals);
        this.objects.fence = fence;
    }

    // generar geometría de la valla, normales, índices, vértices, colores
    generateCircularFence(radius, height, segments) {
        const vertices = [];
        const colors = [];
        const indices = [];
        const normals = [];
        const postWidth = 0.5; // grosor
        height = 1.2; // altura
        
        // generar postes con espaciado
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // crear vértices
            const offsetX = Math.sin(angle) * postWidth/2;
            const offsetZ = Math.cos(angle) * postWidth/2;

            vertices.push(
                x - offsetX, 0, z - offsetZ,      
                x - offsetX, height, z - offsetZ,
                x + offsetX, height, z + offsetZ,  
                x + offsetX, 0, z + offsetZ     
            );
            
            // calcular normales
            normals.push(
                0, 0, 1,  
                0, 0, 1, 
                0, 0, 1,  
                0, 0, 1  
            );

            // generar colores con pequeña variación
            const colorVariation = Math.random() * 0.1;
            for (let j = 0; j < 4; j++) {
                colors.push(
                    0.55 + colorVariation,  
                    0.35 + colorVariation,  
                    0.2 + colorVariation,   
                    1.0
                );
            }
            
            // crear índices
            const baseIndex = i * 4;
            indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,     // front face
                baseIndex, baseIndex + 2, baseIndex + 3      // back face
            );
        }
        
        return {
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            colors: new Float32Array(colors),
            indices: new Uint16Array(indices)
        };
    }  

    // renderizar valla según tipo de shader en uso
    renderFence(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let fenceMVP = mat4.create();
        mat4.multiply(fenceMVP, mvpMatrix, modelMatrix);
    
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.fenceVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        if (shader === this.normalShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.fenceNormal);
            shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
            shader.setUniformMatrix4fv('uModel', modelMatrix);
        }

        if (shader === this.solidShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.fenceColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }
    
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.fenceIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', fenceMVP);

        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;
        this.gl.drawElements(drawMode, this.objects.fence.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    // PÁJAROS

    // crear geometría del pájaro, normales, índices, colores, vértices
    generateBird() {
        const vertices = [];
        const colors = [];
        const indices = [];
        const normals = [];
        
        // cuerpo
        const bodyLength = 0.6;
        const bodyRadius = 0.25;
        const bodySegments = 16;
        
        // vértices del cuerpo
        for (let i = 0; i <= bodySegments; i++) {
            const theta = (i / bodySegments) * Math.PI; 
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let j = 0; j <= bodySegments; j++) {
                const phi = (j / bodySegments) * 2 * Math.PI;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = bodyRadius * sinTheta * cosPhi;
                const y = (bodyRadius * 0.6) * cosTheta;
                const z = bodyRadius * sinTheta * sinPhi;
                vertices.push(x, y, z);

                // cálculo de normales
                const nx = sinTheta * cosPhi;
                const ny = cosTheta;
                const nz = sinTheta * sinPhi;
                normals.push(nx, ny, nz);
    
                // color del cuerpo
                colors.push(0.4 + Math.random() * 0.1, 0.25 + Math.random() * 0.1, 0.15, 1.0);
            }
        }
    
        // crear índices
        for (let i = 0; i < bodySegments; i++) {
            for (let j = 0; j < bodySegments; j++) {
                const first = i * (bodySegments + 1) + j;
                const second = first + bodySegments + 1;
    
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        
        // alas
        const wingSpan = 0.9;
        const wingDepth = 0.2;
        const wingBaseIndex = vertices.length / 3;

        // ala izquierda
        vertices.push(
            -bodyLength * 0.4, 0.0, -wingDepth, 
            -bodyLength * 0.4, 0.0, wingDepth, 
            -bodyLength * 0.4 - wingSpan, 0.0, 0.0 
        );

        // normales del ala izq
        normals.push(
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0
        );

        // ala derecha
        vertices.push(
            bodyLength * 0.4, 0.0, -wingDepth,  
            bodyLength * 0.4, 0.0, wingDepth,   
            bodyLength * 0.4 + wingSpan, 0.0, 0.0 
        );

        // normales del ala dcha
        normals.push(
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0
        );

        // color de las alas
        for (let i = 0; i < 6; i++) {
            colors.push(0.5, 0.35, 0.2, 1.0);
        }

        // índices de las alas
        indices.push(
            wingBaseIndex, wingBaseIndex + 1, wingBaseIndex + 2, // izq
            wingBaseIndex + 3, wingBaseIndex + 4, wingBaseIndex + 5 // dcha
        );

        return {
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            colors: new Float32Array(colors),
            indices: new Uint16Array(indices)
        };
    }

    // inicializar buffers de los pájaros
    initializeBirds() {
        // guardar geometría del pájaro
        this.birdGeometry = this.generateBird();
        
        this.buffers.birdVertex = this.createBuffer(this.birdGeometry.vertices);
        this.buffers.birdNormal = this.gl.createBuffer();
        this.buffers.birdColor = this.createBuffer(this.birdGeometry.colors);
        this.buffers.birdNormal = this.createBuffer(this.birdGeometry.normals);
        this.buffers.birdIndex = this.createIndexBuffer(this.birdGeometry.indices);
        
        // generar pájaros en la escena
        for (let i = 0; i < 5; i++) {
            this.spawnBird();
        }
    }

    // generar pájaros en la escena, dentro de un límite
    spawnBird() {

        if (this.objects.birds.length >= this.maxBirds) return;
        
        // ubicación aleatoria
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = this.birdFlockRadius * (0.7 + Math.random() * 0.3);
        
        const position = [
            this.birdFlockCenter[0] + radius * Math.sin(phi) * Math.cos(theta),
            this.birdFlockCenter[1] + this.birdHeightVariance * (Math.random() - 0.5),
            this.birdFlockCenter[2] + radius * Math.sin(phi) * Math.sin(theta)
        ];
        
        this.objects.birds.push({
            position: position,
            rotation: [0, theta, 0],
            wingAngle: 0,
            wingSpeed: 0.1 + Math.random() * 0.1,
            timeOffset: Math.random() * Math.PI * 2,
            flightRadius: radius,
            baseHeight: position[1],
            state: 'flying',
            flightTime: 0,
            flightDirection: Math.random() < 0.5 ? 1 : -1,
            personalSpace: 2 + Math.random() * 2 
        });
    }

    // animación de los pájaros
    updateBirds(timeStamp) {
        const deltaTime = timeStamp - (this.lastTimeStamp || timeStamp);
        this.lastTimeStamp = timeStamp;
        
        // añadir o eliminar pájaros según la cantidad deseada
        if (timeStamp - this.lastBirdSpawn > this.birdSpawnInterval) {
            if (this.objects.birds.length < this.minBirds) {
                this.spawnBird();
            } else if (this.objects.birds.length < this.maxBirds && Math.random() < 0.3) {
                this.spawnBird();
            }
            this.lastBirdSpawn = timeStamp;
        }
        
        // animar cada pájaro de la escena
        this.objects.birds = this.objects.birds.filter(bird => {
            // actualizar alas
            bird.wingAngle = Math.sin(timeStamp * bird.wingSpeed + bird.timeOffset) * 0.5;

            // estado del pájaro
            switch (bird.state) {
                case 'seeking':
                    // busca semillas cercanas
                    let nearestSeed = null;
                    let nearestDistance = Infinity;
                    
                    this.objects.seeds.forEach(seed => {
                        if (!seed.onGround || seed.consumed) return; 
                        
                        const dx = seed.position[0] - bird.position[0];
                        const dy = seed.position[1] - bird.position[1];
                        const dz = seed.position[2] - bird.position[2];
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        
                        if (distance < this.seedAttractRadius && distance < nearestDistance) {
                            nearestSeed = seed;
                            nearestDistance = distance;
                        }
                    });
                    
                    // si detecta una semilla, baja a por ella
                    if (nearestSeed) {
                        const direction = [
                            nearestSeed.position[0] - bird.position[0],
                            nearestSeed.position[1] - bird.position[1],
                            nearestSeed.position[2] - bird.position[2]
                        ];
                        const distance = Math.sqrt(
                            direction[0] * direction[0] + 
                            direction[1] * direction[1] + 
                            direction[2] * direction[2]
                        );
                        
                        direction[0] /= distance;
                        direction[1] /= distance;
                        direction[2] /= distance;
                        
                        const speed = this.birdSeekingSpeed * deltaTime;
                        bird.position[0] += direction[0] * speed;
                        bird.position[1] += direction[1] * speed;
                        bird.position[2] += direction[2] * speed;

                        bird.rotation[1] = Math.atan2(direction[0], direction[2]);
                        
                        // consumir semillas
                        if (distance < 1.0) {
                            if (!nearestSeed.consumed) { 
                                nearestSeed.consumed = true;
                                // vuelve al cielo
                                bird.state = 'rising';
                                bird.riseStartHeight = bird.position[1];
                                bird.riseTime = 0;
                            } else {
                                // si la semilla ha sido consumida por otro pájaro
                                bird.state = 'flying';
                            }
                        }
                    } else {
                        // si no hay semillas disponibles
                        bird.state = 'flying';
                    }
                    break;
                    
                    case 'rising':
                        // animación para volver al cielo después de consumir semillas
                        bird.riseTime += deltaTime * 0.001;
                        const riseProgress = Math.min(bird.riseTime, 1);
                        
                        const easedProgress = 1 - Math.cos(riseProgress * Math.PI * 0.5);
                        
                        // elevarse hacia dirección aleatoria
                        if (!bird.riseDirection) {
                            bird.riseDirection = {
                                x: (Math.random() - 0.5) * 2,
                                z: (Math.random() - 0.5) * 2
                            };

                            const magnitude = Math.sqrt(
                                bird.riseDirection.x * bird.riseDirection.x + 
                                bird.riseDirection.z * bird.riseDirection.z
                            );
                            bird.riseDirection.x /= magnitude;
                            bird.riseDirection.z /= magnitude;
                            
                            bird.riseStartPos = [...bird.position];
                        }
                        
                        // calcular nueva posición
                        const horizontalDistance = 5; 
                        bird.position[0] = bird.riseStartPos[0] + bird.riseDirection.x * horizontalDistance * easedProgress;
                        bird.position[1] = bird.riseStartHeight + (bird.baseHeight - bird.riseStartHeight) * easedProgress;
                        bird.position[2] = bird.riseStartPos[2] + bird.riseDirection.z * horizontalDistance * easedProgress;
                        
                        bird.rotation[1] = Math.atan2(bird.riseDirection.x, bird.riseDirection.z);
                        
                        // volver al vuelo
                        if (riseProgress >= 1) {
                            bird.state = 'flying';
                            delete bird.riseDirection;
                            delete bird.riseStartPos;
                        }
                        break;

                case 'flying':
                default:
                    if (Math.random() < 0.005 && this.objects.seeds.some(seed => seed.onGround)) { // buscar semillas aleatoriamente
                        bird.state = 'seeking';
                    }

                    // dirección de vuelo
                    const circleSpeed = 0.0005;
                    const heightSpeed = 0.001;
                    
                    // posición en la dirección de vuelo
                    bird.flightTime += deltaTime * circleSpeed;
                    const angle = bird.flightTime * bird.flightDirection;
                    const radius = bird.flightRadius;
                    
                    bird.position[0] = this.birdFlockCenter[0] + Math.cos(angle) * radius;
                    bird.position[2] = this.birdFlockCenter[2] + Math.sin(angle) * radius;
                    
                    // leve osicilación vertical
                    bird.position[1] = bird.baseHeight + 
                        Math.sin(bird.flightTime * heightSpeed) * this.birdHeightVariance;
                    
                    // rotación según la dirección del movimiento
                    bird.rotation[1] = angle + (bird.flightDirection < 0 ? Math.PI : 0);
                    break;
            }
            
            return true;
        });
    }

    // dibujar pájaro según tipo de shader en uso
    renderBirds(shader, mvpMatrix, timeStamp) {
        this.updateBirds(timeStamp);
        
        this.objects.birds.forEach(bird => {
            const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;

            const modelMatrix = mat4.create();
            
            // posición y rotación
            mat4.translate(modelMatrix, modelMatrix, bird.position);
            mat4.rotateY(modelMatrix, modelMatrix, bird.rotation[1]);
            
            // animación de las alas
            const leftWingMatrix = mat4.clone(modelMatrix);
            const rightWingMatrix = mat4.clone(modelMatrix);
            const wingYOffset = Math.sin(timeStamp * bird.wingSpeed + bird.timeOffset) * 0.9;
            
            // ala izquierda
            mat4.translate(leftWingMatrix, leftWingMatrix, [0, wingYOffset, 0]); // Add vertical movement
            mat4.rotateZ(leftWingMatrix, leftWingMatrix, bird.wingAngle);

            // ala derecha
            mat4.translate(rightWingMatrix, rightWingMatrix, [0, wingYOffset, 0]); // Add vertical movement
            mat4.rotateZ(rightWingMatrix, rightWingMatrix, -bird.wingAngle);
            
            // cuerpo
            let birdMVP = mat4.create();
            mat4.multiply(birdMVP, mvpMatrix, modelMatrix);
            
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.birdVertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

            if (shader === this.normalShader) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.birdNormal);
                shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
                shader.setUniformMatrix4fv('uModel', modelMatrix);
            }

            if (shader === this.solidShader) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.birdColor);
                shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            }
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.birdIndex);
            shader.setUniformMatrix4fv('uModelViewProjection', birdMVP);

            this.gl.drawElements(drawMode, this.birdGeometry.indices.length, this.gl.UNSIGNED_SHORT, 0);

            const leftWingMVP = mat4.create();
            mat4.multiply(leftWingMVP, mvpMatrix, leftWingMatrix);
            shader.setUniformMatrix4fv('uModelViewProjection', leftWingMVP);
            this.gl.drawElements(drawMode, 3, this.gl.UNSIGNED_SHORT, 0); 

            const rightWingMVP = mat4.create();
            mat4.multiply(rightWingMVP, mvpMatrix, rightWingMatrix);
            shader.setUniformMatrix4fv('uModelViewProjection', rightWingMVP);
            this.gl.drawElements(drawMode, 3, this.gl.UNSIGNED_SHORT, 0); 
            });
    }

    // SEMILLAS

    // generar semillas
    generateSeedParticle(seed) {
        return {
            position: [...seed.position],
            velocity: [
                (Math.random() - 0.5) * 0.5,  
                Math.random() * 0.5,          
                (Math.random() - 0.5) * 0.5
            ],
            size: 0.1 + Math.random() * 0.1,
            life: 1.0,  
            color: [0.8, 0.7, 0.3, 1.0]  
        };
    }

    // animación de semillas
    updateSeeds(timeStamp) {
    const deltaTime = 1/60; // 60 fps
    const gravity = -9.8;
    
    this.seedParticles = this.seedParticles || [];
    
    this.objects.seeds = this.objects.seeds.filter(seed => {
        // eliminar semillas consumidas o que hayan acabado su tiempo de existir
        if (seed.consumed || timeStamp - seed.spawnTime > this.seedLifespan) {
            // generar partículas cuando se consume la semilla
            if (seed.consumed) {
                for (let i = 0; i < 10; i++) {
                    this.seedParticles.push(this.generateSeedParticle(seed));
                }
            }
            return false;
        }
        
            // animar antes de que caiga al suelo
            if (!seed.onGround) {
                seed.position[0] += seed.velocity[0] * deltaTime;
                seed.position[1] += seed.velocity[1] * deltaTime;
                seed.position[2] += seed.velocity[2] * deltaTime;
                seed.velocity[1] += gravity * deltaTime;
                
                // comprobar si ha caído
                const groundHeight = this.calculateGroundHeight(seed.position[0], seed.position[2]);
                if (seed.position[1] <= groundHeight) {
                    seed.position[1] = groundHeight;
                    seed.onGround = true;
                    
                    // generar partículas de impacto
                    for (let i = 0; i < 5; i++) {
                        this.seedParticles.push(this.generateSeedParticle(seed));
                    }
                }
            }     
            return true;
        });
    
        // actualizar partículas
        this.seedParticles = this.seedParticles.filter(particle => {
            particle.life -= deltaTime * 2; 
            particle.position[0] += particle.velocity[0] * deltaTime;
            particle.position[1] += particle.velocity[1] * deltaTime;
            particle.position[2] += particle.velocity[2] * deltaTime;
            particle.velocity[1] += 0.1 * deltaTime;
            
            return particle.life > 0;
        });
    }

    // crear geometría de la semilla y normales
    generateSeedGeometry = () => {
        const vertices = new Float32Array([
            -0.5, -0.5, 0.0,
            0.5, -0.5, 0.0,
            0.5, 0.5, 0.0,
            -0.5, 0.5, 0.0
        ]);
        
        const normals = new Float32Array([
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0
        ]);
        
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        
        return { vertices, normals, indices };
    };

    // renderizar semillas
    renderSeedParticles(shader, mvpMatrix) {
        if (!this.seedParticles || this.seedParticles.length === 0) return;
        
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // crear geometría de la partícula
        if (!this.buffers.particleGeometry) {
            const geometry = this.generateSeedGeometry();
            this.buffers.particleVertex = this.createBuffer(geometry.vertices);
            this.buffers.particleNormal = this.createBuffer(geometry.normals);
            this.buffers.particleIndex = this.createIndexBuffer(geometry.indices);
        }
        
        this.seedParticles.forEach(particle => {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, particle.position);
            
            // hacer que la partícula esté en dirección a la cámara
            const cameraPos = [
                mvpMatrix[12], 
                mvpMatrix[13], 
                mvpMatrix[14]
            ];
            
            const up = [0, 1, 0];
            const direction = vec3.subtract(vec3.create(), cameraPos, particle.position);
            vec3.normalize(direction, direction);
            const right = vec3.cross(vec3.create(), up, direction);
            vec3.normalize(right, right);
            vec3.cross(up, direction, right);

            modelMatrix[0] = right[0];
            modelMatrix[1] = right[1];
            modelMatrix[2] = right[2];
            modelMatrix[4] = up[0];
            modelMatrix[5] = up[1];
            modelMatrix[6] = up[2];
            modelMatrix[8] = direction[0];
            modelMatrix[9] = direction[1];
            modelMatrix[10] = direction[2];
            
            mat4.scale(modelMatrix, modelMatrix, [particle.size, particle.size, particle.size]);
            
            const particleMVP = mat4.create();
            mat4.multiply(particleMVP, mvpMatrix, modelMatrix);
            
            // preparar atributos
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.particleVertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            
            if (shader === this.normalShader) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.particleNormal);
                shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
                shader.setUniformMatrix4fv('uModel', modelMatrix);
            } else if (shader === this.solidShader) {
                const particleColor = new Float32Array([
                    particle.color[0],
                    particle.color[1],
                    particle.color[2],
                    particle.color[3] * particle.life
                ]);
                shader.setUniform4fv('uColor', particleColor);
            }
            
            shader.setUniformMatrix4fv('uModelViewProjection', particleMVP);
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.particleIndex);
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        });
        
        this.gl.disable(this.gl.BLEND);
    }

    // tirar semilla
    throwSeed(cameraPosition, cameraTarget) {
        // calcular dirección desde la cámara
        const forward = vec3.create();
        vec3.subtract(forward, cameraTarget, cameraPosition);
        vec3.normalize(forward, forward);
        
        const right = vec3.create();
        const up = [0, 1, 0];
        vec3.cross(right, forward, up);
        vec3.normalize(right, right);

         // simular que se tira con la mano derecha
        const seedPosition = vec3.create();
        vec3.scaleAndAdd(seedPosition, cameraPosition, forward, 1.5); 
        vec3.scaleAndAdd(seedPosition, seedPosition, right, 0.5); 
        
        // velocidad y arco de la trayectoria
        const velocity = vec3.create();
        vec3.scale(velocity, forward, 10); 
        velocity[1] += 5; 
        velocity[0] += (Math.random() - 0.5) * 2; 
        velocity[2] += (Math.random() - 0.5) * 2; 
        
        this.objects.seeds.push({
            position: [...seedPosition],
            velocity: [...velocity],
            spawnTime: performance.now(),
            onGround: false
        });
    }
    
  //SOL 

    // inicializar variables del sol, normales, colores, vértices e índices
    initializeSun() {
        const sunRadius = 8;    
        const segments = 32;   
        const vertices = [];
        const colors = [];
        const indices = [];
        const normals = [];
        
        // generar disco
        vertices.push(0, 0, 0);  
        colors.push(1.0, 0.9, 0.2, 1.0);  
        normals.push(0, 0, 1);
        
        // generar segmentos
        for (let i = 0; i <= segments; i++) {
            const angle = (i * 2 * Math.PI) / segments;
            const x = Math.cos(angle) * sunRadius;
            const y = Math.sin(angle) * sunRadius;
            
            vertices.push(x, y, 0);
            colors.push(1.0, 0.7, 0.1, 1.0);  
            normals.push(0, 0, 1); 
            
            if (i < segments) {
                indices.push(0, i + 1, i + 2);
            }
        }
        
        this.buffers.sunVertex = this.createBuffer(new Float32Array(vertices));
        this.buffers.sunColor = this.createBuffer(new Float32Array(colors));
        this.buffers.sunIndex = this.createIndexBuffer(new Uint16Array(indices));
        this.buffers.sunNormal = this.createBuffer(new Float32Array(normals));
        this.objects.sun = {
            vertices: vertices,
            colors: colors,
            indices: indices,
            normals: normals
        };
        
        // posición en el cielo
        this.sunPosition = [20, 80, -60]; 
    }

    // renderizar sol según tipo de shader en uso
    renderSun(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, this.sunPosition);
        
        // asegurarse de que el sol está apuntando al jugador
        const viewDir = vec3.create();
        vec3.subtract(viewDir, [0, 0, 0], this.sunPosition);
        vec3.normalize(viewDir, viewDir);
        
        const up = [0, 1, 0];
        const right = vec3.create();
        vec3.cross(right, up, viewDir);
        vec3.normalize(right, right);
        
        const newUp = vec3.create();
        vec3.cross(newUp, viewDir, right);
        
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
        
        if (shader === this.normalShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sunNormal);
            shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
            shader.setUniformMatrix4fv('uModel', modelMatrix);
        }

        if (shader === this.solidShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sunColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.sunIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', sunMVP);
        
        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;

        this.gl.enable(this.gl.BLEND); 
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.drawElements(drawMode, this.objects.sun.indices.length, this.gl.UNSIGNED_SHORT, 0);
        this.gl.disable(this.gl.BLEND); 
    }

    // inicializar elementos de la escena
    initialize() {
        this.solidShader = new SolidShader(this.gl);
        this.wireframeShader = new WireframeShader(this.gl);
        this.normalShader = new NormalShader(this.gl); // Add normal shader
        this.useWireframe = false; // Toggle state
        this.useCombinedMode = false;

        this.initializeGround();
        this.initializeSky();
        this.initializeSun();
        this.initializeFence();
        this.initializeTrees();
        this.initializeBirds();
    }

    // renderizar elementos de la escena
    render(shader, mvpMatrix, timeStamp) {

        this.updateSeeds(timeStamp);

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LESS);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // seleccionar shader según modo de visualización
        let activeShader;
        switch (this.currentViewMode) {
            // solid shader
            case Scene.ViewModes.SOLID: 
                activeShader = this.solidShader;
                break;
            //wireframe shader
            case Scene.ViewModes.WIREFRAME:
                activeShader = this.wireframeShader;
                break;
            //combinación de solid y wireframe
            case Scene.ViewModes.COMBINED:
                this.solidShader.use();
                this.renderScene(this.solidShader, mvpMatrix, timeStamp);
                this.wireframeShader.use();
                this.renderScene(this.wireframeShader, mvpMatrix, timeStamp);
                return;
            //normal shader
            case Scene.ViewModes.NORMAL:
                activeShader = this.normalShader;
                break;
            default:
                activeShader = this.solidShader;
        }

        activeShader.use();
        this.renderSky(activeShader, mvpMatrix);
        this.renderSun(activeShader, mvpMatrix);
        this.renderScene(activeShader, mvpMatrix, timeStamp);
    }

    // renderizar elementos de la escena
    renderScene(shader, mvpMatrix, timeStamp) {
        this.renderGround(shader, mvpMatrix);
        this.renderFence(shader, mvpMatrix);
        this.renderTrees(shader, mvpMatrix);
        this.renderBirds(shader, mvpMatrix, timeStamp);
        this.renderSeedParticles(shader, mvpMatrix);
    }
    
}