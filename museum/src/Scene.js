import WireframeShader from './shaders/WireframeShader.js';
import SolidShader from './shaders/SolidShader.js';
import NormalShader from './shaders/NormalShader.js';

export default class Scene {
    static ViewModes = {
        SOLID: 0,
        WIREFRAME: 1,
        COMBINED: 2,
        NORMAL: 3,
    };
    
    constructor(gl) {
        this.gl = gl;
        this.objects = {
            ground: null,
            sky: null,
            sun: null,
            trees: null,
            birds: [],  // Initialize the birds array
            seeds: [],   // Add seeds array
        };

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

        this.seedLifespan = 10000; // Seeds last 10 seconds
        this.seedAttractRadius = 50; // Birds are attracted within 8 units
        this.birdSeekingSpeed = 0.02; // How fast birds move towards seeds
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
        const skyRadius = 300;  // Keep large radius
        const segments = 64;
        const vertices = [];
        const colors = [];
        const indices = [];
        
        // Offset the sky dome to be centered at camera height
        const skyOffset = 1.5; // Match initial camera height

        
        // Generate vertices for full dome, starting from below horizon
        for (let i = 0; i <= segments/2; i++) {
            // Adjust latitude range to start from below horizon
            const lat = ((i * Math.PI) / segments) * 1.2 - Math.PI/6; // Start from -30 degrees
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

    initializeBirds() {
        // Store bird geometry for later reference
        this.birdGeometry = this.generateBird();
        
        // Create buffers
        this.buffers.birdVertex = this.createBuffer(this.birdGeometry.vertices);
        this.buffers.birdNormal = this.gl.createBuffer();
        this.buffers.birdColor = this.createBuffer(this.birdGeometry.colors);
        this.buffers.birdIndex = this.createIndexBuffer(this.birdGeometry.indices);
        
        // Initialize some birds
        for (let i = 0; i < 5; i++) {
            this.spawnBird();
        }
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
        const postWidth = 0.5;         // Thinner posts
        height = 1.2;                   // Keep height below camera
        //segments = Math.floor(segments * 0.9);  // Reduce number of posts
        
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

    generateBird() {
        const vertices = [];
        const colors = [];
        const indices = [];
        const normals = [];
        
        // Body (streamlined shape)
        const bodyLength = 0.6;
        const bodyRadius = 0.25;
        const bodySegments = 16;
        
        // Generate body vertices (conical shape)
        for (let i = 0; i <= bodySegments; i++) {
            const theta = (i / bodySegments) * Math.PI; // Latitude
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let j = 0; j <= bodySegments; j++) {
                const phi = (j / bodySegments) * 2 * Math.PI;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                // Vertex position
                const x = bodyRadius * sinTheta * cosPhi;
                const y = (bodyRadius * 0.6) * cosTheta;
                const z = bodyRadius * sinTheta * sinPhi;
                vertices.push(x, y, z);

                // Normal vector (pointing outward from surface)
                const nx = sinTheta * cosPhi;
                const ny = cosTheta;
                const nz = sinTheta * sinPhi;
                normals.push(nx, ny, nz);
    
                // Brownish color for the body
                colors.push(0.4 + Math.random() * 0.1, 0.25 + Math.random() * 0.1, 0.15, 1.0);
            }
        }
    
        // Generate indices
        for (let i = 0; i < bodySegments; i++) {
            for (let j = 0; j < bodySegments; j++) {
                const first = i * (bodySegments + 1) + j;
                const second = first + bodySegments + 1;
    
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        
        // Smaller, triangle-shaped wings
        const wingSpan = 0.9;
        const wingDepth = 0.2;
        const wingBaseIndex = vertices.length / 3;

        // Left wing (attached by side)
        vertices.push(
            -bodyLength * 0.4, 0.0, -wingDepth, // Base-left attachment
            -bodyLength * 0.4, 0.0, wingDepth,  // Base-right attachment
            -bodyLength * 0.4 - wingSpan, 0.0, 0.0 // Tip pointing outward
        );

        // Left wing normals (pointing upward)
        normals.push(
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0
        );

        // Right wing (attached by side)
        vertices.push(
            bodyLength * 0.4, 0.0, -wingDepth,  // Base-left attachment
            bodyLength * 0.4, 0.0, wingDepth,   // Base-right attachment
            bodyLength * 0.4 + wingSpan, 0.0, 0.0 // Tip pointing outward
        );

        // Right wing normals (pointing upward)
        normals.push(
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0
        );

        // Brownish color for wings
        for (let i = 0; i < 6; i++) {
            colors.push(0.5, 0.35, 0.2, 1.0);
        }

        // Wing indices
        indices.push(
            wingBaseIndex, wingBaseIndex + 1, wingBaseIndex + 2, // Left wing
            wingBaseIndex + 3, wingBaseIndex + 4, wingBaseIndex + 5 // Right wing
        );

        return {
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            colors: new Float32Array(colors),
            indices: new Uint16Array(indices)
        };
    }

    generateSeedParticle(seed) {
        return {
            position: [...seed.position],
            velocity: [
                (Math.random() - 0.5) * 0.5,  // Random spread
                Math.random() * 0.5,          // Upward drift
                (Math.random() - 0.5) * 0.5
            ],
            size: 0.1 + Math.random() * 0.1,
            life: 1.0,  // Full life
            color: [0.8, 0.7, 0.3, 1.0]  // Golden yellow
        };
    }

    spawnBird() {
        if (this.objects.birds.length >= this.maxBirds) return;
        
        // Random position on a sphere
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
            personalSpace: 2 + Math.random() * 2 // Random personal space radius
        });
    }

    updateBirds(timeStamp) {
        const deltaTime = timeStamp - (this.lastTimeStamp || timeStamp);
        this.lastTimeStamp = timeStamp;
        
        // Spawn or remove birds to maintain desired flock size
        if (timeStamp - this.lastBirdSpawn > this.birdSpawnInterval) {
            if (this.objects.birds.length < this.minBirds) {
                this.spawnBird();
            } else if (this.objects.birds.length < this.maxBirds && Math.random() < 0.3) {
                this.spawnBird();
            }
            this.lastBirdSpawn = timeStamp;
        }

        this.objects.seeds.forEach((seed, index) => {
            if (seed.onGround) {
                console.log(`Seed ${index}: [${seed.position.map(p => p.toFixed(2))}] onGround: ${seed.onGround}`);
            }
        });
        
        // Update each bird
        this.objects.birds = this.objects.birds.filter(bird => {
            // Update wing animation
            bird.wingAngle = Math.sin(timeStamp * bird.wingSpeed + bird.timeOffset) * 0.5;

            switch (bird.state) {
                case 'seeking':
                    // Check for nearby seeds
                    let nearestSeed = null;
                    let nearestDistance = Infinity;
                    
                    this.objects.seeds.forEach(seed => {
                        if (!seed.onGround || seed.consumed) return; // Only attracted to seeds on ground
                        
                        const dx = seed.position[0] - bird.position[0];
                        const dy = seed.position[1] - bird.position[1];
                        const dz = seed.position[2] - bird.position[2];
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        
                        if (distance < this.seedAttractRadius && distance < nearestDistance) {
                            nearestSeed = seed;
                            nearestDistance = distance;
                        }
                    });
                    
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
                        
                        // Normalize direction
                        direction[0] /= distance;
                        direction[1] /= distance;
                        direction[2] /= distance;
                        
                        // Move towards seed
                        const speed = this.birdSeekingSpeed * deltaTime;
                        bird.position[0] += direction[0] * speed;
                        bird.position[1] += direction[1] * speed;
                        bird.position[2] += direction[2] * speed;
                        
                        // Update rotation to face movement direction
                        bird.rotation[1] = Math.atan2(direction[0], direction[2]);
                        
                        // If very close to seed, consume it
                        if (distance < 1.0) {
                            if (!nearestSeed.consumed) {  // Double check seed hasn't been consumed
                                nearestSeed.consumed = true;
                                // Start rising animation
                                bird.state = 'rising';
                                bird.riseStartHeight = bird.position[1];
                                bird.riseTime = 0;
                            } else {
                                // If seed was already consumed, return to flying
                                bird.state = 'flying';
                            }
                        }
                    } else {
                        // No seeds available, return to flying
                        bird.state = 'flying';
                    }
                    break;
                    
                    case 'rising':
                        // Animation for rising back to flight height with random direction
                        bird.riseTime += deltaTime * 0.001; // Control rise speed
                        const riseProgress = Math.min(bird.riseTime, 1);
                        
                        // Use an easing function for smooth rise
                        const easedProgress = 1 - Math.cos(riseProgress * Math.PI * 0.5);
                        
                        // If this is the first frame of rising, initialize rise direction
                        if (!bird.riseDirection) {
                            bird.riseDirection = {
                                x: (Math.random() - 0.5) * 2, // Random X direction
                                z: (Math.random() - 0.5) * 2  // Random Z direction
                            };
                            // Normalize the direction vector
                            const magnitude = Math.sqrt(
                                bird.riseDirection.x * bird.riseDirection.x + 
                                bird.riseDirection.z * bird.riseDirection.z
                            );
                            bird.riseDirection.x /= magnitude;
                            bird.riseDirection.z /= magnitude;
                            
                            // Store starting position
                            bird.riseStartPos = [...bird.position];
                        }
                        
                        // Calculate new position with horizontal movement
                        const horizontalDistance = 5; // Maximum horizontal distance to travel while rising
                        bird.position[0] = bird.riseStartPos[0] + bird.riseDirection.x * horizontalDistance * easedProgress;
                        bird.position[1] = bird.riseStartHeight + (bird.baseHeight - bird.riseStartHeight) * easedProgress;
                        bird.position[2] = bird.riseStartPos[2] + bird.riseDirection.z * horizontalDistance * easedProgress;
                        
                        // Update rotation to face movement direction
                        bird.rotation[1] = Math.atan2(bird.riseDirection.x, bird.riseDirection.z);
                        
                        // Once risen, return to normal flight and clear rise direction
                        if (riseProgress >= 1) {
                            bird.state = 'flying';
                            delete bird.riseDirection;
                            delete bird.riseStartPos;
                        }
                        break;

                case 'flying':
                default:
                    if (Math.random() < 0.005 && this.objects.seeds.some(seed => seed.onGround)) { // 0.5% chance per update
                        bird.state = 'seeking';
                        console.log('Bird switched to seeking state');
                    }

                    // Normal circular flight pattern
                    const circleSpeed = 0.0005;
                    const heightSpeed = 0.001;
                    
                    // Update position in a circular pattern
                    bird.flightTime += deltaTime * circleSpeed;
                    const angle = bird.flightTime * bird.flightDirection;
                    const radius = bird.flightRadius;
                    
                    bird.position[0] = this.birdFlockCenter[0] + Math.cos(angle) * radius;
                    bird.position[2] = this.birdFlockCenter[2] + Math.sin(angle) * radius;
                    
                    // Add slight vertical movement
                    bird.position[1] = bird.baseHeight + 
                        Math.sin(bird.flightTime * heightSpeed) * this.birdHeightVariance;
                    
                    // Update rotation to face movement direction
                    bird.rotation[1] = angle + (bird.flightDirection < 0 ? Math.PI : 0);
                    break;
            }
            
            return true;
        });
    }

    updateSeeds(timeStamp) {
    const deltaTime = 1/60; // Assume 60fps for physics
    const gravity = -9.8;
    
    // Initialize particles array if it doesn't exist
    this.seedParticles = this.seedParticles || [];
    
    // Update and filter seeds
    this.objects.seeds = this.objects.seeds.filter(seed => {
        // Remove consumed or old seeds
        if (seed.consumed || timeStamp - seed.spawnTime > this.seedLifespan) {
            // Generate particles when seed is consumed
            if (seed.consumed) {
                for (let i = 0; i < 10; i++) {
                    this.seedParticles.push(this.generateSeedParticle(seed));
                }
            }
            return false;
        }
        
            // Update seed physics if not on ground
            if (!seed.onGround) {
                // Update position
                seed.position[0] += seed.velocity[0] * deltaTime;
                seed.position[1] += seed.velocity[1] * deltaTime;
                seed.position[2] += seed.velocity[2] * deltaTime;
                
                // Apply gravity
                seed.velocity[1] += gravity * deltaTime;
                
                // Check ground collision
                const groundHeight = this.calculateGroundHeight(seed.position[0], seed.position[2]);
                if (seed.position[1] <= groundHeight) {
                    seed.position[1] = groundHeight;
                    seed.onGround = true;
                    
                    // Generate impact particles
                    for (let i = 0; i < 5; i++) {
                        this.seedParticles.push(this.generateSeedParticle(seed));
                    }
                }
            }
            
            return true;
        });
    
        // Update particles
        this.seedParticles = this.seedParticles.filter(particle => {
            particle.life -= deltaTime * 2; // Fade out over 0.5 seconds
            
            // Update position
            particle.position[0] += particle.velocity[0] * deltaTime;
            particle.position[1] += particle.velocity[1] * deltaTime;
            particle.position[2] += particle.velocity[2] * deltaTime;
            
            // Add slight upward drift
            particle.velocity[1] += 0.1 * deltaTime;
            
            return particle.life > 0;
        });
    }

    renderGround(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let groundMVP = mat4.create();
        mat4.multiply(groundMVP, mvpMatrix, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.groundVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        // Conditionally bind color buffer if shader is not the wireframe shader
        if (shader !== this.wireframeShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.groundColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.groundIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', groundMVP);
        
        // Use LINES for wireframe, TRIANGLES otherwise
        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;
        this.gl.drawElements(drawMode, this.objects.ground.indices.length, this.gl.UNSIGNED_SHORT, 0);

    }

    renderSky(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let skyMVP = mat4.create();
        mat4.multiply(skyMVP, mvpMatrix, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.skyVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        // Use color buffer only for solid shader
        if (shader !== this.wireframeShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.skyColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.skyIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', skyMVP);
        
        // Render with LINES for wireframe, TRIANGLES for solid shader
        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;

        this.gl.drawElements(drawMode, this.objects.sky.indices.length, this.gl.UNSIGNED_SHORT, 0);
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
        
        // Use color buffer only for solid shader
        if (shader !== this.wireframeShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.sunColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }
        
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.sunIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', sunMVP);
        
        // Render with TRIANGLES for solid shader, LINES for wireframe shader
        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;

        this.gl.enable(this.gl.BLEND); // Enable blending for sun
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.drawElements(drawMode, this.objects.sun.indices.length, this.gl.UNSIGNED_SHORT, 0);
        this.gl.disable(this.gl.BLEND); // Disable blending after rendering sun
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
            
            if (shader !== this.wireframeShader) {
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.trunk.color);
                shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            }
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, treeBuffers.trunk.index);
            shader.setUniformMatrix4fv('uModelViewProjection', treeMVP);
            // Use LINES mode for wireframe
            const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;
            this.gl.drawElements(drawMode, this.treeVariations[treeData.variation].trunk.indices.length, this.gl.UNSIGNED_SHORT, 0);
            
            // Draw leaves
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, treeBuffers.leaves.vertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            
            if (shader !== this.wireframeShader) {
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
    
    renderFence(shader, mvpMatrix) {
        const modelMatrix = mat4.create();
        let fenceMVP = mat4.create();
        mat4.multiply(fenceMVP, mvpMatrix, modelMatrix);
    
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.fenceVertex);
        shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);

        if (shader !== this.wireframeShader) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.fenceColor);
            shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
        }
    
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.fenceIndex);
        shader.setUniformMatrix4fv('uModelViewProjection', fenceMVP);

        // Use LINES for wireframe, TRIANGLES otherwise
        const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;
        this.gl.drawElements(drawMode, this.objects.fence.indices.length, this.gl.UNSIGNED_SHORT, 0);
    }

    renderBirds(shader, mvpMatrix, timeStamp) {
        this.updateBirds(timeStamp);
        
        this.objects.birds.forEach(bird => {
            const drawMode = shader === this.wireframeShader ? this.gl.LINES : this.gl.TRIANGLES;
            const modelMatrix = mat4.create();
            
            // Position and rotation
            mat4.translate(modelMatrix, modelMatrix, bird.position);
            mat4.rotateY(modelMatrix, modelMatrix, bird.rotation[1]);
            
            // Calculate MVP matrix
            let birdMVP = mat4.create();
            mat4.multiply(birdMVP, mvpMatrix, modelMatrix);
            
            // Set up vertex attributes
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.birdVertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
    
            // Set up shader-specific attributes
            if (shader === this.normalShader) {
                // Normal shader: bind normal buffer
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.birdNormal);
                shader.setAttribute('aNormal', 3, this.gl.FLOAT, false, 0, 0);
                shader.setUniformMatrix4fv('uModel', modelMatrix);
            } else if (shader !== this.wireframeShader) {
                // Color shader: bind color buffer
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.birdColor);
                shader.setAttribute('aColor', 4, this.gl.FLOAT, false, 0, 0);
            }
            // Wireframe shader doesn't need additional attributes
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.birdIndex);
            shader.setUniformMatrix4fv('uModelViewProjection', birdMVP);
    
            // Draw body
            const bodyIndicesCount = this.birdGeometry.indices.length - 6;
            this.gl.drawElements(drawMode, bodyIndicesCount, this.gl.UNSIGNED_SHORT, 0);
    
            // Handle wings
            const wingAngle = Math.sin(timeStamp * bird.wingSpeed + bird.timeOffset) * 0.5;
            
            // Left wing
            const leftWingMatrix = mat4.clone(modelMatrix);
            mat4.translate(leftWingMatrix, leftWingMatrix, [-this.bodyLength * 0.4, 0, 0]);
            mat4.rotateZ(leftWingMatrix, leftWingMatrix, wingAngle);
            mat4.translate(leftWingMatrix, leftWingMatrix, [this.bodyLength * 0.4, 0, 0]);
            
            const leftWingMVP = mat4.create();
            mat4.multiply(leftWingMVP, mvpMatrix, leftWingMatrix);
            shader.setUniformMatrix4fv('uModelViewProjection', leftWingMVP);
            if (shader === this.normalShader) {
                shader.setUniformMatrix4fv('uModel', leftWingMatrix);
            }
            this.gl.drawElements(drawMode, 3, this.gl.UNSIGNED_SHORT, bodyIndicesCount * 2);
    
            // Right wing
            const rightWingMatrix = mat4.clone(modelMatrix);
            mat4.translate(rightWingMatrix, rightWingMatrix, [this.bodyLength * 0.4, 0, 0]);
            mat4.rotateZ(rightWingMatrix, rightWingMatrix, -wingAngle);
            mat4.translate(rightWingMatrix, rightWingMatrix, [-this.bodyLength * 0.4, 0, 0]);
            
            const rightWingMVP = mat4.create();
            mat4.multiply(rightWingMVP, mvpMatrix, rightWingMatrix);
            shader.setUniformMatrix4fv('uModelViewProjection', rightWingMVP);
            if (shader === this.normalShader) {
                shader.setUniformMatrix4fv('uModel', rightWingMatrix);
            }
            this.gl.drawElements(drawMode, 3, this.gl.UNSIGNED_SHORT, (bodyIndicesCount + 3) * 2);
        });
    }

    // Add method to render seed particles
    renderSeedParticles(shader, mvpMatrix) {
        if (!this.seedParticles || this.seedParticles.length === 0) return;
        
        // Enable blending for particles
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        
        // Create simple quad for particles
        const particleVertices = new Float32Array([
            -0.5, -0.5, 0.0,
            0.5, -0.5, 0.0,
            0.5, 0.5, 0.0,
            -0.5, 0.5, 0.0
        ]);
        
        const particleIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        
        // Create buffers if they don't exist
        if (!this.buffers.particleVertex) {
            this.buffers.particleVertex = this.createBuffer(particleVertices);
            this.buffers.particleIndex = this.createIndexBuffer(particleIndices);
        }
        
        // Render each particle
        this.seedParticles.forEach(particle => {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, particle.position);
            mat4.scale(modelMatrix, modelMatrix, [particle.size, particle.size, particle.size]);
            
            const particleMVP = mat4.create();
            mat4.multiply(particleMVP, mvpMatrix, modelMatrix);
            
            // Set particle color with alpha based on life
            const particleColor = new Float32Array([
                particle.color[0],
                particle.color[1],
                particle.color[2],
                particle.color[3] * particle.life
            ]);
            
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.particleVertex);
            shader.setAttribute('aPosition', 3, this.gl.FLOAT, false, 0, 0);
            
            if (shader !== this.wireframeShader) {
                // Set color uniform directly since it's the same for all vertices
                shader.setUniform4fv('uColor', particleColor);
            }
            
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.buffers.particleIndex);
            shader.setUniformMatrix4fv('uModelViewProjection', particleMVP);
            
            this.gl.drawElements(this.gl.TRIANGLES, 6, this.gl.UNSIGNED_SHORT, 0);
        });
        
        // Disable blending after rendering particles
        this.gl.disable(this.gl.BLEND);
    }

    // Add seed throwing system
    throwSeed(cameraPosition, cameraTarget) {
        // Calculate throw direction from camera
        const forward = vec3.create();
        vec3.subtract(forward, cameraTarget, cameraPosition);
        vec3.normalize(forward, forward);
        
        // Calculate right direction
        const right = vec3.create();
        const up = [0, 1, 0];
        vec3.cross(right, forward, up);
        vec3.normalize(right, right);

         // Offset the spawn position to the "right hand" of the camera
        const seedPosition = vec3.create();
        vec3.scaleAndAdd(seedPosition, cameraPosition, forward, 1.5); // Slightly in front
        vec3.scaleAndAdd(seedPosition, seedPosition, right, 0.5); // Offset to the right

        
        // Initial velocity: forward direction with upward arc and some randomness
        const velocity = vec3.create();
        vec3.scale(velocity, forward, 10); // Base forward velocity
        velocity[1] += 5; // Upward velocity for the arc
        velocity[0] += (Math.random() - 0.5) * 2; // Random horizontal variation
        velocity[2] += (Math.random() - 0.5) * 2; // Random depth variation
        
        this.objects.seeds.push({
            position: [...seedPosition],
            velocity: [...velocity],
            spawnTime: performance.now(),
            onGround: false
        });
    }

    render(shader, mvpMatrix, timeStamp) {
        // Update seeds in render loop
        this.updateSeeds(timeStamp);

        // Enable depth testing
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LESS);
        
        // Clear both color and depth buffer
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Choose shader based on current view mode
        let activeShader;
        switch (this.currentViewMode) {
            case Scene.ViewModes.SOLID:
                activeShader = this.solidShader;
                break;
            case Scene.ViewModes.WIREFRAME:
                activeShader = this.wireframeShader;
                break;
            case Scene.ViewModes.COMBINED:
                // Render solid first, then overlay wireframe
                this.solidShader.use();
                this.renderScene(this.solidShader, mvpMatrix, timeStamp);
                this.wireframeShader.use();
                this.renderScene(this.wireframeShader, mvpMatrix, timeStamp);
                return; // Skip default rendering since both are handled
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

    // Helper method to render the scene
    renderScene(shader, mvpMatrix, timeStamp) {
        this.renderGround(shader, mvpMatrix);
        this.renderFence(shader, mvpMatrix);
        this.renderTrees(shader, mvpMatrix);
        this.renderBirds(shader, mvpMatrix, timeStamp);
        this.renderSeedParticles(shader, mvpMatrix);
    }
    
}