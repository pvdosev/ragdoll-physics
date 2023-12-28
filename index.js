import { Renderer, Camera, Transform, Orbit, Program, Geometry,
         Sphere, Mesh, Vec3, GLTFLoader, GLTFSkin, TextureLoader} from 'ogl';
import { SkyBox } from './skybox.js';
import { MessageBus } from './abstract.js';
import { Physics } from './physics.js';
import { makeButtonInList } from './ui.js';
import vertShader from './shaders/main.vert';
import fragShader from './shaders/main.frag';
import skinVert from './shaders/skin.vert';
import skinFrag from './shaders/skin.frag';
import physDebugVert from './shaders/physDebug.vert';
import physDebugFrag from './shaders/physDebug.frag';
import * as RAPIER from '@dimforge/rapier3d';

function shallowClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
}

function init() {
    // Initialize graphics
    const canvasElem = document.querySelector("#renderCanvas");
    const renderer = new Renderer({ dpr: 1, canvas: canvasElem, antialias: true });
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

    const mainProgram = new Program(gl, {
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

    function makeSkinProgram (skin) {
        const material = skin.program.gltfMaterial;
        console.log("skin: ", skin);
        return new Program(gl, {
            vertex: skinVert,
            fragment: skinFrag,
            uniforms: {
                boneTexture:{ value: skin.boneTexture },
                boneTextureSize: { value: skin.boneTextureSize },
                tMap: { value: material.baseColorTexture.texture },
            }
        });
    }

    const sphereGeom = new Sphere(gl);
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 1.0, 0.0);
    function makeBall(position) {
        const ball = {}
        ball.mesh = new Mesh(gl, {geometry: sphereGeom, program: mainProgram});
        ball.mesh.setParent(scene);
        ball.body = physics.world.createRigidBody(rigidBodyDesc);
        ball.coll = physics.world.createCollider(RAPIER.ColliderDesc.ball(0.5), ball.body);
        physics.bodyToTransform.set(ball.body.handle, ball.mesh);
        ball.body.setTranslation(position, true);
        return ball;
    }
    // Initialize scene
    const scene = new Transform();
    const skybox = new SkyBox(gl);
    skybox.setParent(scene);

    const balls = [];

    canvasElem.addEventListener('pointerdown', (e) => {
        const clipSpaceX = 2.0 * (e.x / renderer.width) - 1.0;
        const clipSpaceY =  2.0 * (1.0 - e.y / renderer.height) - 1.0;
        const direction = new Vec3(clipSpaceX, clipSpaceY, 0.5);
        camera.unproject(direction);
        direction.sub(camera.position).normalize();
        // it is COMPLETELY ACCIDENTAL that ogl Vec3's work inside Rapier
        const ray = new RAPIER.Ray(camera.position, direction);
        const hit = physics.world.castRayAndGetNormal(ray, 100, false);
        if (hit != null) {
            const hitPoint = ray.pointAt(hit.toi);
            // to use Rapier vectors in ogl they need to be initialized with the ogl math classes
            const hitVec = new Vec3(hitPoint.x, hitPoint.y, hitPoint.z);
            const normal = new Vec3(hit.normal.x, hit.normal.y, hit.normal.z);
            hitVec.add(normal.scale(0.5));
            balls.push(makeBall(hitVec));
        }
    } );

    // Setting up physics debug rendering
    const debugProgram = new Program(gl, {
        vertex: physDebugVert,
        fragment: physDebugFrag,
    });
    debugProgram.name = "debug";

    const debugRenderData = physics.world.debugRender();
    const debugAttrs = {
        position: {
            size: 3,
            usage: gl.STREAM_DRAW,
            data: debugRenderData.vertices,
        },
        color: {
            size: 4,
            usage: gl.STREAM_DRAW,
            data: debugRenderData.colors,
        },
    };
    const physGeometry = new Geometry(gl, debugAttrs);

    const debugMesh = new Mesh(gl, {geometry: physGeometry, program: debugProgram, mode: gl.LINES});
    debugMesh.setParent(scene);

    // Load sausage
    let skin;
    loadAssets();
    async function loadAssets() {
        const gltf = await GLTFLoader.load(gl, `sausage.glb`);
        console.log(gltf);
        const s = gltf.scene || gltf.scenes[0];
        s.forEach((root) => {
            root.traverse((node) => {
                if (node.name === "sausage_skel") node.setParent(scene);
                if (node.program) {
                    if (node instanceof GLTFSkin) {
                        node.program = makeSkinProgram(node);
                        skin = node;
                    }
                    else node.program = mainProgram;
                }
            });
        });
        console.log("scene: ", scene);
    }

    // Physics sausage
    const sausage_segment = new Capsule(0.5, 1);


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
    let startTime, lastTime, newBuf;
    let debugBufLen = debugRenderData.vertices.length;

    requestID = requestAnimationFrame(update);
    function update(time) {
        if (startTime === undefined) {
            startTime = time;
        }
        const totalTime = time - startTime;
        if (skin) {
            for (const bone of skin.skeleton.joints) {
                bone.position.y = Math.sin((totalTime) / 1000 + bone.position.x * 2);
            }
        }
        physics.update();

        // update buffers for physics collider rendering
        newBuf = physics.world.debugRender();
        debugAttrs.position.data = newBuf.vertices;
        debugAttrs.color.data = newBuf.colors;
        if (newBuf.vertices.length !== debugBufLen) {
            if (newBuf.vertices.length > debugBufLen) {
                gl.bindBuffer(gl.ARRAY_BUFFER, debugAttrs.position.buffer);
                gl.bufferData(gl.ARRAY_BUFFER, newBuf.vertices, gl.STREAM_DRAW);
                gl.bindBuffer(gl.ARRAY_BUFFER, debugAttrs.color.buffer);
                gl.bufferData(gl.ARRAY_BUFFER, newBuf.colors, gl.STREAM_DRAW);
                gl.renderer.state.boundBuffer = debugAttrs.color.buffer;
            }
            debugAttrs.position.count = newBuf.vertices.length / 3;
            debugAttrs.color.count = newBuf.colors.length / 4;
            physGeometry.drawRange.count = newBuf.vertices.length / 3;
        }
        debugBufLen = newBuf.vertices.length;
        physGeometry.updateAttribute(debugAttrs.position);
        physGeometry.updateAttribute(debugAttrs.color);

        controls.update();
        renderer.render({ scene, camera, sort: false, frustumCull: false });

        requestID = requestAnimationFrame(update);
    }
}

init();
