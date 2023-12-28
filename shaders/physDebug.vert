#version 300 es
in vec3 position;
in vec4 color;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

out vec4 vColor;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vColor = color;
}
