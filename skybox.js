import { Program, Mesh, Texture, Box } from 'ogl';

export class SkyBox extends Mesh {
    constructor(gl, imgArray) {
        const texture = new Texture(gl, { image: imgArray, target: gl.TEXTURE_CUBE_MAP });
        const geometry = new Box(gl);
        const program = new Program(gl, {
            vertex: `#version 300 es
            in vec3 position;
            out vec3 uv;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            void main() {
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                uv = position;
            }
            `,
            fragment: `#version 300 es
            precision highp float;
            //uniform samplerCube tMap;
            in vec3 uv;
            out vec4 outColor;

            void main() {
                float sky = clamp((-uv.y + 0.5) + uv.x, 0.0, 1.0);
                //outColor = texture(tMap, uv);
                outColor = vec4(0.1, 0.1, sky/2.0, 1.0);
            }
            `,
            //uniforms: {
            //    tMap: { value: texture },
            //},
            cullFace: null,
        });

        super(gl, { geometry, program });
        this.worldMatrix.scale(100);
        this.beforeRenderCallbacks = [
            () => {
                this.program.uniforms.modelViewMatrix.value.setPosition([0, 0, 0]);
            }
        ];
    }

    updateMatrix() {
        return;
    }
    updateMatrixWorld(force) {
        return;
    }
}
