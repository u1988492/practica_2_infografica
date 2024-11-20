import { initWebGL } from './utils.js';
import SolidShader from './shaders/SolidShader.js';

let gl, canvas;
let projectionMatrix, viewMatrix, modelMatrix;
let vertexBuffer, colorBuffer;
let solidShader;

const camera = {
    position: [0, 1.5, 5],
    target: [0, 1.5, -5],
    up: [0, 1, 0],
};

let keysPressed = {};
let yaw = 0;
let pitch = 0

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
    modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, [0, 0.5, 0]);

    mat4.perspective(projectionMatrix, Math.PI/3, canvas.width / canvas.height, 0.1, 100.0);
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);
    console.log("View Matrix:", viewMatrix);

    solidShader = new SolidShader(gl);
    setupRoom();
    //setupSimpleTriangle();

    console.log("Camera Position:", camera.position);
console.log("Camera Target:", camera.target);
console.log("Projection Matrix:", projectionMatrix);
console.log("View Matrix:", viewMatrix);
    
    setupEventListeners();

    render();
}

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
    let pitch = 0; // Vertical angle (look up/down)
    let yaw = 0;   // Horizontal angle (look left/right)
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

function render() {
    updateCamera();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    solidShader.use();

    // Set a solid color for the room
    solidShader.setColor([0.5, 0.5, 0.5, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Correct attribute setup
    const positionAttributeLocation = gl.getAttribLocation(solidShader.program, 'aPosition');
    if (positionAttributeLocation === -1) {
        console.error("Attribute 'aPosition' not found in the shader program.");
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    const colorAttributeLocation = gl.getAttribLocation(solidShader.program, 'aColor');
    if (colorAttributeLocation === -1) {
        console.error("Attribute 'aColor' not found in the shader program.");
        return;
    }

    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Debug: Check if vertex buffer data is set
const bufferData = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
if (bufferData === 0) {
    console.error("Vertex buffer is empty or not bound correctly.");
}

    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);

    solidShader.setUniformMatrix4fv('uModelViewProjection', mvpMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, 36);

    requestAnimationFrame(render);
}

function updateCamera() {
    const moveSpeed = 0.1;
    const forward = vec3.create();
    const right = vec3.create();
    const up = [0, 1, 0];

    // Calculate new target position based on yaw and pitch
    let targetX = camera.position[0] + Math.sin(yaw) * Math.cos(pitch);
    let targetY = camera.position[1] + Math.sin(pitch); // Adjust vertical angle (pitch)
    let targetZ = camera.position[2] + Math.cos(yaw) * Math.cos(pitch);

    camera.target = [targetX, targetY, targetZ]; // Update camera's target

    // Recalculate the view matrix to update the camera position and direction
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);

    // Calculate forward and right directions based on yaw and pitch
    vec3.subtract(forward, camera.target, camera.position);
    vec3.normalize(forward, forward);

    vec3.cross(right, forward, up);
    vec3.normalize(right, right);

    // Handle movement (WASD keys)
    if (keysPressed['w']) {  // Forward
        vec3.scaleAndAdd(camera.position, camera.position, forward, moveSpeed);
        vec3.scaleAndAdd(camera.target, camera.target, forward, moveSpeed);
    }
    if (keysPressed['s']) {  // Backward
        vec3.scaleAndAdd(camera.position, camera.position, forward, -moveSpeed);
        vec3.scaleAndAdd(camera.target, camera.target, forward, -moveSpeed);
    }
    if (keysPressed['a']) {  // Left
        vec3.scaleAndAdd(camera.position, camera.position, right, -moveSpeed);
        vec3.scaleAndAdd(camera.target, camera.target, right, -moveSpeed);
    }
    if (keysPressed['d']) {  // Right
        vec3.scaleAndAdd(camera.position, camera.position, right, moveSpeed);
        vec3.scaleAndAdd(camera.target, camera.target, right, moveSpeed);
    }

    // Update the view matrix after any movement
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);
}





function setupRoom() {
    const vertices = new Float32Array([
        // Floor
        -5, 0, -5,  5, 0, -5,  5, 0, 5,
        -5, 0, -5,  5, 0, 5,  -5, 0, 5,
        // Left wall
        -5, 0, -5,  -5, 5, -5,  -5, 5, 5,
        -5, 0, -5,  -5, 5, 5,  -5, 0, 5,
        // Right wall
        5, 0, -5,  5, 5, -5,  5, 5, 5,
        5, 0, -5,  5, 5, 5,  5, 0, 5,
        // Back wall
        -5, 0, -5,  -5, 5, -5,  5, 5, -5,
        -5, 0, -5,  5, 5, -5,  5, 0, -5,
        // Ceiling
        -5, 5, -5,  5, 5, -5,  5, 5, 5,
        -5, 5, -5,  5, 5, 5,  -5, 5, 5,
    ]);

     // Add the same indices to create faces with different colors
     const colors = new Float32Array([
        // Floor colors (gray)
        0.5, 0.5, 0.5, 1.0,  0.5, 0.5, 0.5, 1.0,  0.5, 0.5, 0.5, 1.0,
        0.5, 0.5, 0.5, 1.0,  0.5, 0.5, 0.5, 1.0,  0.5, 0.5, 0.5, 1.0,
        // Left wall colors (light blue)
        0.4, 0.6, 1.0, 1.0,  0.4, 0.6, 1.0, 1.0,  0.4, 0.6, 1.0, 1.0,
        0.4, 0.6, 1.0, 1.0,  0.4, 0.6, 1.0, 1.0,  0.4, 0.6, 1.0, 1.0,
        // Right wall colors (light green)
        0.6, 1.0, 0.4, 1.0,  0.6, 1.0, 0.4, 1.0,  0.6, 1.0, 0.4, 1.0,
        0.6, 1.0, 0.4, 1.0,  0.6, 1.0, 0.4, 1.0,  0.6, 1.0, 0.4, 1.0,
        // Back wall colors (light red)
        1.0, 0.4, 0.4, 1.0,  1.0, 0.4, 0.4, 1.0,  1.0, 0.4, 0.4, 1.0,
        1.0, 0.4, 0.4, 1.0,  1.0, 0.4, 0.4, 1.0,  1.0, 0.4, 0.4, 1.0,
        // Ceiling colors (light yellow)
        1.0, 1.0, 0.4, 1.0,  1.0, 1.0, 0.4, 1.0,  1.0, 1.0, 0.4, 1.0,
        1.0, 1.0, 0.4, 1.0,  1.0, 1.0, 0.4, 1.0,  1.0, 1.0, 0.4, 1.0,
    ]);

    // Create buffer for colors
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

function setupSimpleTriangle() {
    const vertices = new Float32Array([
        0.0,  0.5,  0.0,   // Vertex 1
       -0.5, -0.5,  0.0,   // Vertex 2
        0.5, -0.5,  0.0,   // Vertex 3
    ]);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

// Call main when the page loads
window.onload = main;