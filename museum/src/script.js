import { initWebGL } from './utils.js';
import SolidShader from './shaders/SolidShader.js';

let gl, canvas;
let projectionMatrix, viewMatrix;

let solidShader;

const camera = {
    position: [0, 1.5, 5],
    target: [0, 1.5, -5],
    up: [0, 1, 0],
};

let keysPressed = {};
let yaw = 0;
let pitch = 0;

function setupEventListeners() {
    // Event listeners for keyboard and mouse events
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;
    });
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
    });

    let lastMouseX = 0;
    let lastMouseY = 0;
    let isMouseDown = false;
    let sensitivity = 0.002; // Sensitivity for mouse movement

    canvas.addEventListener('mousedown', (event) => {
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (!isMouseDown) return;

        let deltaX = event.clientX - lastMouseX;
        let deltaY = event.clientY - lastMouseY;

        yaw += deltaX * sensitivity;  // Update horizontal angle
        pitch -= deltaY * sensitivity;  // Update vertical angle (invert Y-axis)

        // Clamp pitch to avoid flipping
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

        // Update camera target based on yaw and pitch
        updateCamera();
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
}


const roomBounds = {
    minX: -10, maxX: 10,
    minY: 0, maxY: 10,
    minZ: -10, maxZ: 10
};


function updateCamera() {
    const moveSpeed = 0.1;
    const forward = vec3.create();
    const right = vec3.create();
    const up = [0, 1, 0];

    // Calculate direction based on yaw and pitch
    const dirX = Math.cos(pitch) * Math.sin(yaw);
    const dirY = Math.sin(pitch);
    const dirZ = Math.cos(pitch) * Math.cos(yaw);


    // Update camera target
    camera.target = [
        camera.position[0] + dirX,
        camera.position[1] + dirY,
        camera.position[2] + dirZ,
    ];

    // Calculate forward and right directions based on yaw and pitch
    vec3.subtract(forward, camera.target, camera.position);
    vec3.normalize(forward, forward);

    vec3.cross(right, forward, up);
    vec3.normalize(right, right);

    // Handle movement (WASD keys)
    if (keysPressed['w']) {
        vec3.scaleAndAdd(camera.position, camera.position, forward, moveSpeed);
    }
    if (keysPressed['s']) {
        vec3.scaleAndAdd(camera.position, camera.position, forward, -moveSpeed);
    }
    if (keysPressed['a']) {
        vec3.scaleAndAdd(camera.position, camera.position, right, -moveSpeed);
    }
    if (keysPressed['d']) {
        vec3.scaleAndAdd(camera.position, camera.position, right, moveSpeed);
    }

    const cameraRadius = 0.1; // Small buffer
    // Collision detection: Clamp camera position within room bounds
    camera.position[0] = Math.max(roomBounds.minX + cameraRadius, Math.min(roomBounds.maxX - cameraRadius, camera.position[0]));
    camera.position[1] = Math.max(roomBounds.minY + cameraRadius, Math.min(roomBounds.maxY - cameraRadius, camera.position[1]));
    camera.position[2] = Math.max(roomBounds.minZ + cameraRadius, Math.min(roomBounds.maxZ - cameraRadius, camera.position[2]));


    // Update the view matrix after any movement
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);
}

// Vertex and color data for the ground (a flat plane)
const groundVertices = new Float32Array([
    -10, 0, -10,  // Bottom-left
    10, 0, -10,   // Bottom-right
    10, 0, 10,    // Top-right
    -10, 0, -10,  // Bottom-left
    10, 0, 10,    // Top-right
    -10, 0, 10,   // Top-left
]);

const groundColors = new Float32Array([
    0.3, 0.7, 0.3, 1.0,  // Greenish
    0.3, 0.7, 0.3, 1.0,  // Greenish
    0.3, 0.7, 0.3, 1.0,  // Greenish
    0.3, 0.7, 0.3, 1.0,  // Greenish
    0.3, 0.7, 0.3, 1.0,  // Greenish
    0.3, 0.7, 0.3, 1.0,  // Greenish
]);

// Vertex and color data for the sky (a large dome-like structure)
const skyVertices = new Float32Array([
    -100, -10, -100,  // Bottom-left
    100, -10, -100,   // Bottom-right
    100, 100, 100,    // Top-center
    -100, -10, -100,  // Bottom-left
    100, 100, 100,    // Top-center
    -100, 100, 100,   // Top-left
]);


const skyColors = new Float32Array([
    0.5, 0.7, 1.0, 1.0,  // Sky blue
    0.5, 0.7, 1.0, 1.0,  // Sky blue
    0.5, 0.7, 1.0, 1.0,  // Sky blue
    0.5, 0.7, 1.0, 1.0,  // Sky blue
    0.5, 0.7, 1.0, 1.0,  // Sky blue
    0.5, 0.7, 1.0, 1.0,  // Sky blue
]);

function generateDome(radius, segments) {
    const vertices = [];
    const colors = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
        const theta = (Math.PI / 2) * (i / segments); // From 0 to π/2 for upper hemisphere
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let j = 0; j <= segments; j++) {
            const phi = (2 * Math.PI) * (j / segments); // Full circle around the y-axis
            const x = radius * sinTheta * Math.cos(phi);
            const y = radius * cosTheta;
            const z = radius * sinTheta * Math.sin(phi);

            vertices.push(x, y, z);
            colors.push(0.5, 0.7, 1.0, 1.0); // Sky blue
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

    return { vertices: new Float32Array(vertices), colors: new Float32Array(colors), indices: new Uint16Array(indices) };
}

const sun = generateDome(5, 32); // Radius 5

// Position the sun above the dome
const sunPosition = [0, 40, -30];


// Buffers for ground and sky
let groundVertexBuffer, groundColorBuffer;
let skyVertexBuffer, skyColorBuffer;

function setupGroundAndSkyBuffers() {
    // Ground buffers
    groundVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    groundColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundColors, gl.STATIC_DRAW);

    // Sky buffers
    skyVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyVertices, gl.STATIC_DRAW);

    skyColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skyColors, gl.STATIC_DRAW);

    const sunVertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sun.vertices, gl.STATIC_DRAW);

const sunColorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, sunColorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, sun.colors, gl.STATIC_DRAW);

const sunIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sunIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sun.indices, gl.STATIC_DRAW);

}

const dome = generateDome(50, 32); // Radius 50, 32 segments

const domeVertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, domeVertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, dome.vertices, gl.STATIC_DRAW);

const domeColorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, domeColorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, dome.colors, gl.STATIC_DRAW);

const domeIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, domeIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, dome.indices, gl.STATIC_DRAW);



function render() {
    updateCamera(); // Update camera position and direction

    // Clear the screen
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    solidShader.use(); // Use the solid color shader

    // Set up the common MVP matrix
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);

    // Draw the Sky Dome
    const skyModelMatrix = mat4.create(); // No transformation needed for sky dome
    let skyMVPMatrix = mat4.create();
    mat4.multiply(skyMVPMatrix, mvpMatrix, skyModelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, domeVertexBuffer);
    solidShader.setAttribute('aPosition', 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, domeColorBuffer);
    solidShader.setAttribute('aColor', 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, domeIndexBuffer);
    solidShader.setUniformMatrix4fv('uModelViewProjection', skyMVPMatrix);

    gl.drawElements(gl.TRIANGLES, dome.indices.length, gl.UNSIGNED_SHORT, 0);

    // Draw the Sun
    const sunModelMatrix = mat4.create();
    mat4.translate(sunModelMatrix, sunModelMatrix, sunPosition);

    let sunMVPMatrix = mat4.create();
    mat4.multiply(sunMVPMatrix, mvpMatrix, sunModelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, sunVertexBuffer);
    solidShader.setAttribute('aPosition', 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sunColorBuffer);
    solidShader.setAttribute('aColor', 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sunIndexBuffer);
    solidShader.setUniformMatrix4fv('uModelViewProjection', sunMVPMatrix);

    gl.drawElements(gl.TRIANGLES, sun.indices.length, gl.UNSIGNED_SHORT, 0);

    // Draw the Ground
    const groundModelMatrix = mat4.create(); // No transformation needed for ground
    let groundMVPMatrix = mat4.create();
    mat4.multiply(groundMVPMatrix, mvpMatrix, groundModelMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundVertexBuffer);
    solidShader.setAttribute('aPosition', 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, groundColorBuffer);
    solidShader.setAttribute('aColor', 4, gl.FLOAT, false, 0, 0);

    solidShader.setUniformMatrix4fv('uModelViewProjection', groundMVPMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, groundVertices.length / 3);

    // Schedule the next frame
    requestAnimationFrame(render);
}



function main() {
    canvas = document.getElementById('webgl-canvas');
    gl = initWebGL(canvas);

    if (!gl) {
        console.error('WebGL2 not available');
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    gl.enable(gl.DEPTH_TEST);

    projectionMatrix = mat4.create();
    viewMatrix = mat4.create();

    mat4.perspective(projectionMatrix, Math.PI / 3, canvas.width / canvas.height, 0.1, 100.0);
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);

    solidShader = new SolidShader(gl);
    
    
    setupGroundAndSkyBuffers(); // Create buffers for ground and sky
    
    setupEventListeners();

    render();
}

// Call main when the page loads
window.onload = main;