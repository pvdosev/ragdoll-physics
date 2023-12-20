#version 300 es
precision highp float;
//in vec2 v_uv;
//in vec4 vColor;
in vec3 vNormal;
in vec3 vSurfaceToLight[3];
in vec3 vSurfaceToCamera;
out vec4 outColor;
//uniform sampler2D tBaseColor;
uniform vec3 lightColor[3];

vec3 unlit() {
    return vec3(0.1, 0.1, 0.1);
}

void main() {
    vec3 viewDir = normalize(vSurfaceToCamera);
    vec3 normal = normalize(vNormal);

    vec3 lightTotal;
    for (int i = 0; i < 3; ++i) {
        lightTotal = lightTotal + clamp(dot(normalize(vSurfaceToLight[i]), normal), 0.0, 1.0) * lightColor[i];
    }
    outColor = vec4(unlit() + lightTotal, 1.0);
}
