//archivo para guardar funciones auxiliares

// inicialización del contexto WebGL
export function initWebGL(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('No se pudo inicializar WebGL2.');
        return null;
    }
    return gl;
}
