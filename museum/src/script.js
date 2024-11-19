//archivo principal de gestión del funcionamiento

import { mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@2.8.1/esm/index.js'; //librería gl-matrix
import { initWebGL } from './utils.js'; //archivo auxiliar
import SolidShader from './shaders/SolidShader.js' //clase de solid shader

//variables iniciales
let gl, canvas;
let projectionMatrix, viewMatrix, modelMatrix;
let vertexBuffer;
let solidShader;

const camera = {
    position: [0, 1.5, 5], //posición de la cámara
    target: [0, 1.5, 0], //punto de mira de la cámara
    up: [0, 1, 0], //dirección "arriba"
};

//creación de la escena
function main() {
    //inicializar contexto webgl
    canvas = document.getElementById('webgl-canvas');
    gl = initWebGL(canvas);

    if (!gl) {
        console.error('WebGL2 no está disponible');
        return;
    }

    // preparar viewport y resetear color
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //preparar matrices
    projectionMatrix = mat4.create();
    viewMatrix = mat4.create();
    modelMatrix = mat4.create();

    //proyección: perspectiva en primera persona; FOV: 45 grados, near: 0.1, far: 100
    mat4.perspective(projectionMatrix, Math.PI/4, canvas.width / canvas.height, 0.1, 100.0);

    //matriz de vista: la cámara apunta al target
    mat4.lookAt(viewMatrix, camera.position, camera.target, camera.up);

    solidShader = new SolidShader(gl);

    //crear sala
    setupRoom();

    // bucle de renderizado
    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //usar programa de solid shader
    solidShader.use();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    solidShader.setAttribute('aPosition', 3, gl.FLOAT, false, 0, 0);

    //combinar matrices para renderizar
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, projectionMatrix, viewMatrix); // poyección * vista
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix); //(proyección*vista)*modelo

    //pasar la matriz al shader 
    solidShader.setUniformMatrix4fv('uModelViewProjection', mvpMatrix);

    //dibujar la sala
    gl.drawArrays(gl.TRIANGLES, 0, 36); //12 triángulos; 36 vértices


    requestAnimationFrame(render);
}

function setupRoom(){
    //vértices de la sala: suelo, 3 paredes, techo
    const vertices = new Float32Array([
        //suelo
        -5, 0, -5,  5, 0, -5,  5, 0, 5,
        -5, 0, -5,  5, 0, 5,  -5, 0, 5,
        //pared izq
        -5, 0, -5,  -5, 5, -5,  -5, 5, 5,
        -5, 0, -5,  -5, 5, 5,  -5, 0, 5,
        //pared dcha
        5, 0, -5,  5, 5, -5,  5, 5, 5,
        5, 0, -5,  5, 5, 5,  5, 0, 5,
        //pared atrás
        -5, 0, -5,  -5, 5, -5,  5, 5, -5,
        -5, 0, -5,  5, 5, -5,  5, 0, -5,
        //techo
        -5, 5, -5,  5, 5, -5,  5, 5, 5,
        -5, 5, -5,  5, 5, 5,  -5, 5, 5,
    ]);

    //crear vertex buffer y guardar la geometría de la sala
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

main();
