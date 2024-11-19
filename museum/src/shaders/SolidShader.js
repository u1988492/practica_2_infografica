//shader colores sólidos

import BaseShader from "./BaseShader.js";

export default class SolidShader extends BaseShader{
    constructor(gl){
        const vsSource = `#version 300 es
        layout(location = 0) in vec4 aPosition;
        uniform mat4 uModelViewProjection;
        void main() {
            gl_Position = uModelViewProjection * aPosition;
        }}`;

        const fsSource = `#version 300 es
        precision mediump float;
        uniform vec4 uColor; // color uniform
        out vec4 fragColor;
        void main() {
            fragColor = uColor; // color pasado desde el uniform
        }`;

        super(gl, vsSource, fsSource);
    }

    setColor(color){
        this.setUniform1f('uColor', color);
    }
}