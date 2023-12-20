import * as RAPIER from '@dimforge/rapier3d';

export class Physics {
    constructor() {
        this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
        const world = this.world;
        this.bodyToTransform = new Map();
        // Create the ground
        const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
        world.createCollider(groundColliderDesc);

        // // Create a dynamic rigid-body.
        // const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 1.0, 0.0);
        // const rigidBody = world.createRigidBody(rigidBodyDesc);
        // this.rigidBody = rigidBody;
        // // Create a cuboid collider attached to the dynamic rigidBody.
        // const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
        // const collider = world.createCollider(colliderDesc, rigidBody);
    }
    update() {
        this.world.step();
        this.world.forEachActiveRigidBody((body) => {
            const pos = body.translation();
            const rot = body.rotation();
            const mesh = this.bodyToTransform.get(body.handle);
            mesh.position.set(pos.x, pos.y, pos.z);
            mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        });
        // for (const object of physObjs) {
        //     const pos = object.body.translation();
        //     const rot = object.body.rotation();
        //     object.mesh.position.set(pos.x, pos.y, pos.z);
        //     object.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        // }
        // Get and print the rigid-body's position.
        //let position = this.rigidBody.translation();
        //console.log("Rigid-body position: ", position.x, position.y, position.z);
    }
}
