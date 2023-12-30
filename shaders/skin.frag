#version 300 es
precision highp float;

uniform sampler2D tMap;
uniform sampler2D boneTexture;

in vec2 vUv;
in vec3 vNormal;
out vec4 outColor;

void main() {
    // vec3 tex = texture2D(tMap, vUv).rgb;

    // vec3 normal = normalize(vNormal);
    // vec3 light = vec3(0.0, 1.0, 0.0);
    // float shading = min(0.0, dot(normal, light) * 0.2);

    // outColor.rgb = tex + shading;
    // outColor.a = 1.0;
    outColor.rgb = texture(tMap, vUv).rgb;
    outColor.a = 1.0;
}
