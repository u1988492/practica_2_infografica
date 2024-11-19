//clase de control de tipo de shader

export default class BaseShader{
    constructor(gl, vsSource, fsSource){
        this.gl = gl;
        this.program = this.initShaderProgram(vsSource, fsSource);
        if(!this.program) throw new Error("No se pudo inicializar el programa de shader.");
    }

    initShaderProgram(vsSource, fsSource){
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
    
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
    
        if(!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)){
            console.error('No se pudo iniciaizar el programa de shader: ', this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }
    
        return shaderProgram;
    }
    
    loadShader(type, source){
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
    
        if(!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)){
            console.error('Error compilando el shader: ', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    
    use(){
        this.gl.useProgram(this.program);
    }

    //método para crear atributos
    setAttribute(attributeName, size, type, normalize, stride, offset){
        const location = this.gl.getAttribLocation(this.program, attributeName);
        this.gl.vertexAttribPointer(location, size, type, normalize, offset);
        this.gl.enableVertexAttribArray(location);
    }

    setUniform1f(name, value){
        const location = this.getUniformLocation(name);
        this.gl.uniform1f(location, value);
    }

    setUniformMatrix4fv(name, matrix){
        const location = this.getUniformLocation(name);
        this.gl.uniformMatrix4fv(location, false, matrix);
    }
    
    getUniformLocation(name){
        return this.gl.getUniformLocation(this.program, name);
    }
}

