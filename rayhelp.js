import { Vec3, Raycast } from 'ogl';

// ogl has a raycast class, but using it directly is annoying
// this helps us track extra information about raycasting

export class RaycastHelper {
  constructor(renderer) {
    this.renderer = renderer;
    this.raycast = new Raycast(renderer.gl);
    this.intersectLists = {};
    this.intersectionTypes = {
      BOUNDS: this.intersectBounds.bind(this),
      MESHES: this.intersectMeshes.bind(this),
    };
  }

  createList(list, type) {
    this.intersectLists[list] = {
      func: this.intersectionTypes[type],
      array: [],
    };
  }
  intersectList(list) {
    return this.intersectLists[list].func(
      this.intersectLists[list].array
    );
  }

  addObject(object, list) {
    if (this.intersectLists[list]) {
      this.intersectLists[list].array.push(object);
    } else { console.warn("Intersection list doesn't exist!") }
  }

  removeObject(object, list) {
    if (this.intersectLists[list]) {
      const objIndex = this.intersectLists[list].array.indexOf(object);
      if (objIndex > -1) { this.intersectLists[list].array.splice(objIndex, 1) }
    } else { console.warn("Intersection list doesn't exist!") }
  }

  castMouseRay(e, camera) {
    // that long calculation there turns the canvas coordinates into clip space coords
    this.raycast.castMouse(
      camera,
      [2.0 * (e.x / this.renderer.width) - 1.0, 2.0 * (1.0 - e.y / this.renderer.height) - 1.0]
    );
  }
  intersectPlane(plane) {
    return this.raycast.intersectPlane(plane);
  }
  intersectMeshes(objList, options) {
    return this.raycast.intersectMeshes(objList, options);
  }
  intersectBounds(cellList) {
    // probably breaks if boxes aren't axis aligned
    const hits = [];

    for (const cell of cellList) {
      cell.hitDistance = this.raycast.intersectBox(cell.bounds);
      if (cell.hitDistance) hits.push(cell);
    }

    hits.sort((a, b) => a.hitDistance - b.hitDistance);
    return hits;
  }
}
