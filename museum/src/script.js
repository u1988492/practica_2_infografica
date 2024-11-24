import { initWebGL } from './utils.js';
import Scene from './Scene.js';
import SolidShader from './shaders/SolidShader.js';

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

let yaw = 0;
let pitch = 0;

let keysPressed = {};

// limpieza de instancias creadas
function cleanup() {
    // eliminar event listeners
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseup', handleMouseUp);
    
    // eliminar escena
    if (scene) {
        scene.dispose();
        scene = null;
    }
    
    // limpiar shader
    if (solidShader) {
        solidShader.dispose();
        solidShader = null;
    }
    
    // reiniciar variables
    gl = null;
    canvas = null;
    projectionMatrix = null;
    viewMatrix = null;
}

// prepración de cámara y movimientos

function setupEventListeners() {
    //detectar movimientos de jugador y cámara
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;
    });
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key] = false;
    });

    // guardar posiciones del ratón
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isMouseDown = false;
    let sensitivity = 0.002;

    // detectar click en pantalla
    canvas.addEventListener('mousedown', (event) => {
        isMouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    });

    // mover cámara según el movimiento del mouse
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

    // dejar de actualizar cámara cuando se suelta el mouse
    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    //detectar interacciones
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key] = true;
    
        // cambiar modo de visualización
        if (event.key === 'v' || event.key === 'V') { 
            scene.currentViewMode = (scene.currentViewMode + 1) % Object.keys(Scene.ViewModes).length; 
        }
    
        // tirar semillas
        if (event.key === 'f' || event.key === 'F') {
            scene.throwSeed(camera.position, camera.target);
        }
    });

    // detectar cambio de tamaño de la pestaña
    window.addEventListener('resize', () => {
        if (!gl || !canvas) return;
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        // actualizar cámara según el tamaño de la pantalla
        mat4.perspective(projectionMatrix, Math.PI / 3, canvas.width / canvas.height, 0.1, 100.0);
    });

    // limpiar event listeners creados
    window.addEventListener('unload', cleanup);

}

// limitar movimiento del jugador al interior de la valla, teniendo en cuenta el tamaño del jugador
function isPositionValid(position, fenceRadius) {
    const x = position[0];
    const z = position[2];
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    return distanceFromCenter <= fenceRadius - 1; 
}

// actualizar posición de la cámara según las teclas WASD y el movimiento del mouse
function updateCamera() {
    const moveSpeed = 0.12; // velocidad del jugador

    // movimiento en 3 direcciones
    const dirX = Math.cos(pitch) * Math.sin(yaw);
    const dirY = Math.sin(pitch);
    const dirZ = Math.cos(pitch) * Math.cos(yaw);

    // posición a la que apunta la cámara
    camera.target = [
        camera.position[0] + dirX,
        camera.position[1] + dirY,
        camera.position[2] + dirZ,
    ];

    // vector de "delante"
    const forward = vec3.create();
    vec3.subtract(forward, camera.target, camera.position);
    forward[1] = 0;
    vec3.normalize(forward, forward);

    // vector de "derecha"
    const right = vec3.create();
    const up = [0, 1, 0];
    vec3.cross(right, forward, up);
    vec3.normalize(right, right);

    // crear posición nueva
    const newPosition = vec3.clone(camera.position);

    // aplicar movimientos según el sentido y la dirección
    if (keysPressed['w']) vec3.scaleAndAdd(newPosition, newPosition, forward, moveSpeed);
    if (keysPressed['s']) vec3.scaleAndAdd(newPosition, newPosition, forward, -moveSpeed);
    if (keysPressed['a']) vec3.scaleAndAdd(newPosition, newPosition, right, -moveSpeed);
    if (keysPressed['d']) vec3.scaleAndAdd(newPosition, newPosition, right, moveSpeed);

    // altura mínima de la cámara (según el jugador)
    const minHeight = 1.5; 
    newPosition[1] = Math.max(newPosition[1], minHeight);

    if (keysPressed['w'] || keysPressed['s'] || keysPressed['a'] || keysPressed['d']) {
        const proposedPosition = vec3.clone(newPosition);
        // controlar que la nueva posición esté dentro de la valla
        if (!isPositionValid(proposedPosition, scene.fenceRadius)) {
            vec3.copy(newPosition, camera.position);
        }
    }
    
    // actualizar posición
    camera.position = newPosition;
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);
}

// renderizar escena
function render(timeStamp = 0) {
    updateCamera();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // comenzar con solid shader por defecto
    solidShader.use();
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix);

    scene.render(solidShader, mvpMatrix, timeStamp);
    requestAnimationFrame(render); // actualizar escena a cada frame
}

function main() {
    // inicializar contexto webgl
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

    mat4.perspective(projectionMatrix, Math.PI / 3, canvas.width / canvas.height, 0.1, 1000.0);
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);

    // crear escena
    solidShader = new SolidShader(gl);
    scene = new Scene(gl);
    scene.initialize();
    
    setupEventListeners();
    render();
}

window.onload = main;