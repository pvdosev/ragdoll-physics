import physDebugVert from './shaders/physDebug.vert';
import physDebugFrag from './shaders/physDebug.frag';
import { Program, Mesh, Geometry} from 'ogl';

export class PhysDebugMesh extends Mesh {
  constructor(gl, world, scene) {
    const program = new Program(gl, {
        vertex: physDebugVert,
        fragment: physDebugFrag,
    });
    const renderData = world.debugRender();
    const attrs = {
        position: {
            size: 3,
            usage: gl.STREAM_DRAW,
            data: renderData.vertices,
        },
        color: {
            size: 4,
            usage: gl.STREAM_DRAW,
            data: renderData.colors,
        },
    };
    const geom = new Geometry(gl, attrs);
    super(gl, {geometry: geom, program: program, mode: gl.LINES});
    this.attrs = attrs;
    this.world = world;
    this.geometry = geom;
    this.bufLen = renderData.vertices.length;
    this.gl = gl;
    this.scene = scene;
    this.enabled = false;
  }

  updateBuffers() {
    const newBuf = this.world.debugRender();
    this.attrs.position.data = newBuf.vertices;
    this.attrs.color.data = newBuf.colors;
    if (newBuf.vertices.length !== this.bufLen) {
      if (newBuf.vertices.length > this.bufLen) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attrs.position.buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, newBuf.vertices, this.gl.STREAM_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attrs.color.buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, newBuf.colors, this.gl.STREAM_DRAW);
        this.gl.renderer.state.boundBuffer = this.attrs.color.buffer;
      }
      this.attrs.position.count = newBuf.vertices.length / 3;
      this.attrs.color.count = newBuf.colors.length / 4;
      this.geometry.drawRange.count = newBuf.vertices.length / 3;
    }
    this.bufLen = newBuf.vertices.length;
    this.geometry.updateAttribute(this.attrs.position);
    this.geometry.updateAttribute(this.attrs.color);
  }

  toggle() {
    if (this.enabled) {
      this.enabled = false;
      this.setParent(null);
    } else {
      this.enabled = true;
      this.setParent(this.scene);
    }
  }
}
