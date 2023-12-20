import { Renderer, Camera, Transform, Orbit, Program, Sphere, Mesh, Vec3 } from 'ogl';
import { SkyBox } from './skybox.js';
import { MessageBus } from './abstract.js';
import { Physics } from './physics.js';
import { makeButtonInList } from './ui.js';
import vertShader from './shaders/main.vert';
import fragShader from './shaders/main.frag';

function shallowClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}

function init() {
    // Initialize graphics
    const canvasElem = document.querySelector("#renderCanvas");
    const renderer = new Renderer({ dpr: 1, canvas: canvasElem });
    const gl = renderer.gl;

    // Orbit camera & window resize helper
    const camera = new Camera(gl, { near: 0.1, far: 10000 });
    const controls = new Orbit(camera, { element: canvasElem });
    camera.position
        .set(0, 0.5, -1)
        .normalize()
        .multiply(2.5)
        .add([5, 5, -5]);
    controls.target.copy([0, 2, 2]);
    controls.forcePosition();

    function resize() {
        renderer.setSize(canvasElem.parentNode.clientWidth, canvasElem.parentNode.clientHeight);
        camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    }
    window.addEventListener('resize', resize, false);
    resize();

    // Initialize non-graphics things
    const msgBus = new MessageBus();
    const physics = new Physics();

    // Main Shader
    const lightPosition = [new Vec3(10.0, 1.0, 0.0), new Vec3(0.0, 10.0, 3.0), new Vec3(0.0, 1.0, 5.0)];
    const lightColor = [new Vec3(0.2, 0.7, 1.0), new Vec3(1.0, 1.0, 1.0), new Vec3(0.9, 0.1, 0.2)];
    const lightFalloff = [1.0, 0.5, 1.0];
    const lightPenumbra = [];
    const lightUmbra = [];

    const program = new Program(gl, {
        vertex: vertShader,
        fragment: fragShader,
        uniforms: {
            cameraPosition: { value: camera.position },
            lightPosition: { value: lightPosition },
            lightColor: { value: lightColor },
            lightFalloff: { value: lightFalloff },
            lightPenumbra: { value: lightPenumbra },
            lightUmbra: { value: lightUmbra },
        },
    });

    // Initialize scene
    const scene = new Transform();
    const skybox = new SkyBox(gl);
    skybox.setParent(scene);

    const sphereGeom = new Sphere(gl);
    const ball = {mesh: new Mesh(gl, {geometry: sphereGeom, program})};
    console.log(ball, sphereGeom);
    ball.mesh.setParent(scene);

    // Add Pause Button
    let paused = false;
    let requestID;

    makeButtonInList("Pause", "buttonList", () => {
        if (paused) {
            requestID = requestAnimationFrame(update);
            paused = false;
        } else {
            cancelAnimationFrame(requestID);
            paused = true;
        }
    })

    // Main Loop
    requestID = requestAnimationFrame(update);
    function update() {
        requestID = requestAnimationFrame(update);
        physics.update();
        controls.update();
        renderer.render({ scene, camera, sort: false, frustumCull: false });
    }
}

init();
