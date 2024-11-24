En este proyecto se muestra una escena 3D generada mediante WebGL que simula un pequeño parque. 

Mediante una cámara en primera persona, el usuario puede moverse dentro de una zona del parque delimitada por una valla utilizando las teclas WASD.
También puede mover la cámara haciendo click sobre la escena y arrastrando. 

En la escena, se generan árboles de forma aleatoria fuera de la valla. Se generan también pájaros que vuelan en direcciones aleatorias. 
El usuario puede tirar semillas pulsando la tecla 'F', y los pájaros cercanos bajarán a comer la semillas. Después, resumirán su vuelo.

Presionando la tecla 'V', se puede cambiar el modo de visualización de la escena. Existen los siguientes modos:
* Solid Shader: muestra la escena con los colores de cada elemento
* Wireframe Shader: muestra la escena con solamente las líneas que componen los elementos
* Combinación de solid y wireframe: muestra la escena renderizando primero los elementos con colores sólidos, y después con sus líneas
* Normal Shader: muestra las normales de los elementos de la escena mediante degradados de RGB

Los archivos del proyecto son los siguientes:
* index.html: contiene el HTML con el canvas
* src: contiene los archivos js de gestión de la escena
    - utils.js: archivo con código auxiliar adicional
    - script.js: maneja la interacción con el usuario y renderiza la escena
    - Scene.js: maneja todos los elementos de la escena: suelo, cielo, sol, árboles, valla, pájaros, semillas. Instancia los shaders y cambia dinámicamente durante la ejecución
    - shaders: contiene los archivos de shaders
        > BaseShader.js: shader base del que heredan su comportamiento el resto de tipos de shader
        > NormalShader.js: shader de normales
        > SolidShader.js: shader de colores sólidos
        > WireframeShader.js: shader de wireframe
* libs: contiene librerías
    - gl-matrix: librería para crear los elementos 3D
    - tree-generator.js: pequeña librería de funciones relacionadas a los árboles

Problemas a mencionar:
- Hay algún problema con la renderización del cielo, parece que la parte de arriba no se renderiza bien
- En el modo combinado, no se renderizan el cielo y el sol ya que daban problemas
- En el modo de normales, no se renderizan los árboles correctamente
- De vez en cuando hay algún comportamiento raro al girar la cámara demasiado hacia arriba