import { Renderer, Camera, Transform, Orbit, Program, Geometry,
         Sphere, Mesh, Vec3, GLTFLoader, GLTFSkin, TextureLoader} from 'ogl';
import { SkyBox } from './skybox.js';
import { PhysDebugMesh } from './physdebug.js';
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
    const rigidBodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic).setTranslation(0.0, 1.0, 0.0);
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

    // Setting up physics debug rendering
    const debugMesh = new PhysDebugMesh(gl, physics.world, scene);

    // Physics sausage
    function makeCapsule(x, y, z, length, radius) {
        const collDesc = new RAPIER.ColliderDesc(new RAPIER.Capsule(length, radius));
        const bodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic).setTranslation(x, y, z);
        const body = physics.world.createRigidBody(bodyDesc);
        return {
            body: body,
            coll: physics.world.createCollider(collDesc, body),
        };
    }

    function makeJoint(anchor1, anchor2, body1, body2) {
        const params = RAPIER.JointData.spherical(anchor1, anchor2);
        const joint = physics.world.createImpulseJoint(params, body1, body2, true);
        joint.setContactsEnabled(false);
        return joint;
    }

    // Graphics sausage
    let skin;
    loadAssets();
    async function loadAssets() {
        const gltf = await GLTFLoader.load(gl, `sausage.glb`);
        console.log(gltf);
        const s = gltf.scene || gltf.scenes[0];
        s.forEach((root) => {
            root.traverse((node) => {
                if (node.program) {
                    if (node instanceof GLTFSkin) {
                        node.program = makeSkinProgram(node);
                        skin = node;
                    }
                    else node.program = mainProgram;
                }
            });
        });
    }

    function makeSausage(position) {
        // this is almost a generic skin cloner
        const sausageParent = new Transform();
        const newSkel = {
            joints: [],
            inverseBindMatrices: shallowClone(skin.skeleton.inverseBindMatrices),
        }
        for (const bone of skin.skeleton.joints) {
            const newBone = new Transform();
            newBone.matrix.copy(bone.matrix);
            newBone.decompose(); // eww, rotten bones in my sausage!
            newBone.scale.set(0.1);
            newBone.bindInverse = shallowClone(bone.bindInverse);
            newBone.setParent(sausageParent);
            newSkel.joints.push(newBone);
        }

        const newSkin = new GLTFSkin(gl, {
            skeleton: newSkel,
            program: skin.program,
            geometry: skin.geometry,
        });
        newSkin.setParent(sausageParent);
        console.log(newSkin, newSkel);

        sausageParent.setParent(scene);
        const s1 = makeCapsule(position.x, position.y + 0.9, position.z, 0.03, 0.215);
        const s2 = makeCapsule(position.x, position.y + 0.6, position.z, 0.03, 0.215);
        const s3 = makeCapsule(position.x, position.y + 0.3, position.z, 0.03, 0.215);
        const s4 = makeCapsule(position.x, position.y, position.z, 0.03, 0.215);
        physics.bodyToTransform.set(s1.body.handle, newSkel.joints[0]);
        physics.bodyToTransform.set(s2.body.handle, newSkel.joints[1]);
        physics.bodyToTransform.set(s3.body.handle, newSkel.joints[2]);
        physics.bodyToTransform.set(s4.body.handle, newSkel.joints[3]);

        makeJoint({x: 0, y: 0.15, z: 0}, {x: 0, y: -0.15, z: 0}, s1.body, s2.body);
        makeJoint({x: 0, y: 0.15, z: 0}, {x: 0, y: -0.15, z: 0}, s2.body, s3.body);
        makeJoint({x: 0, y: 0.15, z: 0}, {x: 0, y: -0.15, z: 0}, s3.body, s4.body);

        return sausageParent;
    }

    const balls = [];
    canvasElem.addEventListener('pointerdown', (e) => {
        const clipSpaceX = 2.0 * (e.x / renderer.width) - 1.0;
        const clipSpaceY =  2.0 * (1.0 - e.y / renderer.height) - 1.0;
        const direction = new Vec3(clipSpaceX, clipSpaceY, 0.5);
        camera.unproject(direction);
        direction.sub(camera.position).normalize();
        //it is COMPLETELY ACCIDENTAL that ogl Vec3's work inside Rapier
        const ray = new RAPIER.Ray(camera.position, direction);
        const hit = physics.world.castRayAndGetNormal(ray, 100, false);
        if (hit != null) {
            const hitPoint = ray.pointAt(hit.toi);
            //to use Rapier vectors in ogl they need to be initialized with the ogl math classes
            const hitVec = new Vec3(hitPoint.x, hitPoint.y, hitPoint.z);
            const normal = new Vec3(hit.normal.x, hit.normal.y, hit.normal.z);
            hitVec.add(normal.scale(0.5));
            balls.push(makeSausage(hitVec));
        }
    } );

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
    });
    makeButtonInList("Show/Hide Colliders", "buttonList", () => {
        debugMesh.toggle();
    })

    // Main Loop
    let startTime, lastTime;

    requestID = requestAnimationFrame(update);
    function update(time) {
        if (startTime === undefined) {
            startTime = time;
        }
        const totalTime = time - startTime;
        // if (skin) {
        //     for (const bone of skin.skeleton.joints) {
        //         bone.position.y = Math.sin((totalTime) / 1000 + bone.position.x * 2);
        //     }
        // }
        physics.update();

        //update buffers for physics collider rendering
        if (debugMesh.enabled) debugMesh.updateBuffers();

        controls.update();

        renderer.render({ scene, camera, sort: false, frustumCull: false });

        requestID = requestAnimationFrame(update);
    }
}

init();
