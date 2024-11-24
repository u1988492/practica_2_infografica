import BaseShader from './BaseShader.js';

export default class NormalShader extends BaseShader {
    constructor(gl) {
        const vsSource = `#version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec3 aNormal;
        uniform mat4 uModelViewProjection;
        uniform mat4 uModel;
        out vec3 vNormal;
        void main() {
            gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
            vNormal = mat3(uModel) * aNormal;
        }`;

        const fsSource = `#version 300 es
        precision mediump float;
        in vec3 vNormal;
        out vec4 fragColor;
        void main() {
            vec3 normalizedNormal = normalize(vNormal);
            fragColor = vec4((normalizedNormal + 1.0) * 0.5, 1.0); 
        }`;

        super(gl, vsSource, fsSource);
    }
}
