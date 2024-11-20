import BaseShader from "./BaseShader.js";

export default class SolidShader extends BaseShader {
    constructor(gl) {
        const vsSource = `#version 300 es
        layout(location = 0) in vec3 aPosition;
        layout(location = 1) in vec4 aColor; // Color attribute
        uniform mat4 uModelViewProjection;
        out vec4 fragColor; // Pass color to fragment shader
        void main() {
            gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
            fragColor = aColor; // Output color to fragment shader
        }`;

        const fsSource = `#version 300 es
        precision mediump float;
        in vec4 fragColor; // Input from vertex shader
        out vec4 fragColorOut;
        void main() {
            fragColorOut = fragColor; // Output the color
        }`;


        super(gl, vsSource, fsSource);
        this.gl = gl;
    }

    setColor(color) {
        this.use();
        const colorLocation = this.gl.getUniformLocation(this.program, 'uColor');
        this.gl.uniform4fv(colorLocation, color);
    }
}