import BaseShader from './BaseShader.js';

export default class WireframeShader extends BaseShader {
    constructor(gl) {
        const vsSource = `#version 300 es
        layout(location = 0) in vec3 aPosition;
        uniform mat4 uModelViewProjection;
        void main() {
            gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
        }`;

        const fsSource = `#version 300 es
        precision mediump float;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(1.0, 1.0, 1.0, 1.0); // White lines
        }`;

        super(gl, vsSource, fsSource);
    }
}
