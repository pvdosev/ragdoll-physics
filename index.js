import { Renderer, Camera, Transform, Orbit, Program,
         Sphere, Mesh, Vec3, GLTFLoader, GLTFSkin, TextureLoader} from 'ogl';
import { SkyBox } from './skybox.js';
import { MessageBus } from './abstract.js';
import { Physics } from './physics.js';
import { makeButtonInList } from './ui.js';
import vertShader from './shaders/main.vert';
import fragShader from './shaders/main.frag';
import skinVert from './shaders/skin.vert';
import skinFrag from './shaders/skin.frag';
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
        ball.mesh = new Mesh(gl, {geometry: sphereGeom, program});
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
            console.log(hitVec);
        }
    } );

    loadAssets();
    async function loadAssets() {
        const gltf = await GLTFLoader.load(gl, `sausage.glb`);
        console.log(gltf);
        const s = gltf.scene || gltf.scenes[0];
        s.forEach((root) => {
            root.traverse((node) => {
                //if (node.geometry && node.extras.asset_id) { assets.items[node.extras.asset_id] = node }
                //if (node.extras.wall_id) { assets.walls[node.extras.wall_id] = node }
                console.log(node);
                if (node.name === "sausage_skel") {
                    node.setParent(scene);
                }
                if (node.program) {
                    const material = node.program.gltfMaterial || {};
                    if (node instanceof GLTFSkin) node.program = makeSkinProgram(node);
                    else node.program = program;
                }
            });
        });
    }

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
