import { initWebGL } from './utils.js';
import SolidShader from './shaders/SolidShader.js';
import Scene from './Scene.js';

//preparación de variables
let gl, canvas;
let projectionMatrix, viewMatrix;
let solidShader;
let scene;

const camera = {
    position: [0, 1.5, 5],
    target: [0, 1.5, -5],
    up: [0, 1, 0],
};

let keysPressed = {};
let yaw = 0;
let pitch = 0;

//prepración de cámara y movimientos

function setupEventListeners() {
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;
    });
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
    });

    let lastMouseX = 0;
    let lastMouseY = 0;
    let isMouseDown = false;
    let sensitivity = 0.002;

    canvas.addEventListener('mousedown', (event) => {
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    canvas.addEventListener('mousemove', (event) => {
        if (!isMouseDown) return;
        let deltaX = event.clientX - lastMouseX;
        let deltaY = event.clientY - lastMouseY;
        yaw += deltaX * sensitivity;
        pitch -= deltaY * sensitivity;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        updateCamera();
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
}

function updateCamera() {
    const moveSpeed = 0.1;
    const dirX = Math.cos(pitch) * Math.sin(yaw);
    const dirY = Math.sin(pitch);
    const dirZ = Math.cos(pitch) * Math.cos(yaw);

    camera.target = [
        camera.position[0] + dirX,
        camera.position[1] + dirY,
        camera.position[2] + dirZ,
    ];

    // Calculate forward vector and flatten it
    const forward = vec3.create();
    vec3.subtract(forward, camera.target, camera.position);
    forward[1] = 0; // Flatten the forward vector by removing Y component
    vec3.normalize(forward, forward);

    // Calculate right vector based on flattened forward
    const right = vec3.create();
    const up = [0, 1, 0];
    vec3.cross(right, forward, up);
    vec3.normalize(right, right);

    // Create a new position vector for updates
    const newPosition = vec3.clone(camera.position);

    // Apply movement
    if (keysPressed['w']) vec3.scaleAndAdd(newPosition, newPosition, forward, moveSpeed);
    if (keysPressed['s']) vec3.scaleAndAdd(newPosition, newPosition, forward, -moveSpeed);
    if (keysPressed['a']) vec3.scaleAndAdd(newPosition, newPosition, right, -moveSpeed);
    if (keysPressed['d']) vec3.scaleAndAdd(newPosition, newPosition, right, moveSpeed);

    // Enforce minimum height
    const minHeight = 1.5; // Your desired minimum height
    newPosition[1] = Math.max(newPosition[1], minHeight);
    
    // Update position
    camera.position = newPosition;

    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);
}


function render() {
    updateCamera();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    solidShader.use();
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);

    scene.render(solidShader, mvpMatrix);
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
    scene = new Scene(gl);
    scene.initialize();
    
    setupEventListeners();
    render();
}

window.onload = main;