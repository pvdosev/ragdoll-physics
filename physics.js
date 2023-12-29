import * as RAPIER from '@dimforge/rapier3d';

export class Physics {
    constructor() {
        this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
        const world = this.world;
        this.bodyToTransform = new Map();
        // Create the ground
        const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
        world.createCollider(groundColliderDesc);
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
    }
}
