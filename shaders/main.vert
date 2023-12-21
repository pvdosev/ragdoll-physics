#version 300 es
in vec3 position;
//in vec4 color;
in vec3 normal;
//in vec2 uv;
uniform vec3 cameraPosition;
uniform vec3 lightPosition[3];
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform mat4 projectionMatrix;

//out vec2 vUV;
//out vec4 vColor;
out vec3 vNormal;
out vec3 vSurfaceToLight[3];
out vec3 vSurfaceToCamera;

void main() {
    vec3 surfaceWorldPosition = mat3(modelMatrix) * position;
    for (int i = 0; i < 3; ++i) {
        vSurfaceToLight[i] = lightPosition[i] - surfaceWorldPosition;
    }
    vSurfaceToCamera = cameraPosition - surfaceWorldPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    //vColor = color;
    vNormal = mat3(modelMatrix) * normal;
    //v_uv = uv;
}
