import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoBlending,
  NoToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderer,
  WebGLRenderTarget,
  type TextureFilter,
  type IUniform,
} from "three";
import {
  fullscreenVertex,
  advectionFragment,
  splatFragment,
  divergenceFragment,
  pressureFragment,
  gradientFragment,
} from "./fluid-shaders";

// Settings from fA in temp/main.js, with a wider brush to match the supplied
// full-height screenshots. Its curlStrength is zero, so the
// curl/vorticity passes are identities and can be omitted without visual change.
export const FLUID_SETTINGS = {
  simResolution: 256,
  dyeResolution: 512,
  velocityDissipation: 0.962,
  dyeDissipation: 0.958,
  pressureIterations: 20,
  splatRadius: 0.0006,
  splatForce: 5900,
  revealSize: 3.9,
  edgeSoftness: 0.5,
  edgeWidth: 0.01,
} as const;

const revealFragment = `
precision highp float;
uniform sampler2D uDye;
uniform sampler2D uVideo;
uniform float uRevealSize;
uniform float uEdgeSoftness;
uniform float uEdgeWidth;
uniform float uVideoAspect;
uniform float uPlaneAspect;
uniform float uVideoCenterY;
varying vec2 vUv;
void main() {
  float dye = texture2D(uDye, vUv).r;
  float mask = clamp(smoothstep(uEdgeSoftness, uEdgeSoftness + uEdgeWidth,
    dye * uRevealSize), 0.0, 1.0);
  // Supplied CSS: video width:100%, height:auto, centered in Y.
  vec2 videoUv = vec2(vUv.x, (vUv.y - uVideoCenterY) * uVideoAspect / uPlaneAspect + 0.5);
  vec3 color = vec3(0.0);
  if (videoUv.y >= 0.0 && videoUv.y <= 1.0) color = texture2D(uVideo, videoUv).rgb;
  // Equivalent to the reference's base-to-transparent composite, retaining
  // the accessible DOM wordmark underneath. No noise or video warping.
  gl_FragColor = vec4(color, mask);
}`;

type DoubleTarget = {
  read: WebGLRenderTarget;
  write: WebGLRenderTarget;
  swap: () => void;
};

export class FluidReveal {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private geometry = new PlaneGeometry(2, 2);
  private mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private targets: WebGLRenderTarget[] = [];
  private materials: ShaderMaterial[] = [];
  private velocity: DoubleTarget;
  private dye: DoubleTarget;
  private pressure: DoubleTarget;
  private divergence: WebGLRenderTarget;
  private splat: ShaderMaterial;
  private advect: ShaderMaterial;
  private divergencePass: ShaderMaterial;
  private pressurePass: ShaderMaterial;
  private gradient: ShaderMaterial;
  private reveal: ShaderMaterial;
  private videoTexture: VideoTexture;
  private simTexel = new Vector2(
    1 / FLUID_SETTINGS.simResolution,
    1 / FLUID_SETTINGS.simResolution,
  );
  private dyeTexel = new Vector2(
    1 / FLUID_SETTINGS.dyeResolution,
    1 / FLUID_SETTINGS.dyeResolution,
  );
  private pointer = new Vector2(0.5, 0.5);
  private previous = new Vector2(0.5, 0.5);
  private pointerActive = false;
  private moved = false;
  private aspect = 1;
  private disposed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private video: HTMLVideoElement,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    // Signed velocity/pressure require float buffers. On unsupported GPUs the
    // React wrapper leaves the DOM hero in place instead of creating bad trails.
    if (!this.renderer.extensions.has("EXT_color_buffer_float")) {
      this.renderer.dispose();
      this.geometry.dispose();
      throw new Error("Floating-point render targets unavailable");
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0, 0);
    this.renderer.autoClear = false;
    this.renderer.toneMapping = NoToneMapping;
    this.velocity = this.doubleTarget(
      FLUID_SETTINGS.simResolution,
      LinearFilter,
    );
    this.dye = this.doubleTarget(FLUID_SETTINGS.dyeResolution, LinearFilter);
    this.pressure = this.doubleTarget(
      FLUID_SETTINGS.simResolution,
      NearestFilter,
    );
    this.divergence = this.target(FLUID_SETTINGS.simResolution, NearestFilter);
    this.splat = this.material(splatFragment, {
      uTarget: { value: null },
      uAspectRatio: { value: 1 },
      uPoint: { value: new Vector2() },
      uColor: { value: new Vector3() },
      uRadius: { value: FLUID_SETTINGS.splatRadius },
    });
    this.advect = this.material(advectionFragment, {
      uVelocity: { value: null },
      uSource: { value: null },
      uTexelSize: { value: this.simTexel },
      // Original advection dt is 1 per frame, NOT delta seconds.
      uDt: { value: 1 },
      uDissipation: { value: FLUID_SETTINGS.velocityDissipation },
    });
    this.divergencePass = this.material(divergenceFragment, {
      uVelocity: { value: null },
      uTexelSize: { value: this.simTexel },
    });
    this.pressurePass = this.material(pressureFragment, {
      uPressure: { value: null },
      uDivergence: { value: this.divergence.texture },
      uTexelSize: { value: this.simTexel },
    });
    this.gradient = this.material(gradientFragment, {
      uPressure: { value: null },
      uVelocity: { value: null },
      uTexelSize: { value: this.simTexel },
    });
    this.videoTexture = new VideoTexture(video);
    this.reveal = this.material(revealFragment, {
      uDye: { value: this.dye.read.texture },
      uVideo: { value: this.videoTexture },
      uRevealSize: { value: FLUID_SETTINGS.revealSize },
      uEdgeSoftness: { value: FLUID_SETTINGS.edgeSoftness },
      uEdgeWidth: { value: FLUID_SETTINGS.edgeWidth },
      uVideoAspect: { value: 1890 / 1080 },
      uPlaneAspect: { value: 1 },
      uVideoCenterY: { value: 0.5 },
    });
    this.mesh = new Mesh(this.geometry, this.reveal);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.clear();
    this.resize();
  }

  private target(size: number, filter: TextureFilter) {
    const target = new WebGLRenderTarget(size, size, {
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: filter,
      magFilter: filter === NearestFilter ? NearestFilter : LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.targets.push(target);
    return target;
  }

  private doubleTarget(size: number, filter: TextureFilter): DoubleTarget {
    return {
      read: this.target(size, filter),
      write: this.target(size, filter),
      swap() {
        [this.read, this.write] = [this.write, this.read];
      },
    };
  }

  private material(fragmentShader: string, uniforms: Record<string, IUniform>) {
    const material = new ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      toneMapped: false,
    });
    this.materials.push(material);
    return material;
  }

  private renderPass(
    material: ShaderMaterial,
    target: WebGLRenderTarget | null,
  ) {
    this.mesh.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.aspect = Math.max(1, width) / Math.max(1, height);
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.reveal.uniforms.uPlaneAspect.value = this.aspect;
    // The canvas extends across the intro, but the video stays aligned with
    // the hero wordmark. Below the film the reveal continues as solid ink.
    const hero = this.canvas.parentElement?.querySelector<HTMLElement>(".hero");
    this.reveal.uniforms.uVideoCenterY.value =
      1 - ((hero?.clientHeight ?? height) * 0.5) / Math.max(1, height);
    this.releasePointer();
  }

  movePointer(x: number, y: number) {
    this.pointer.set(x, y);
    // Avoid flinging dye from a stale coordinate when the pointer re-enters.
    if (!this.pointerActive) this.previous.copy(this.pointer);
    this.pointerActive = true;
    this.moved = true;
  }

  releasePointer() {
    this.pointerActive = false;
    this.moved = false;
  }

  clear() {
    for (const target of this.targets) {
      this.renderer.setRenderTarget(target);
      this.renderer.clear();
    }
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.releasePointer();
  }

  // Fixed 60 Hz clock: 120/144 Hz screens retain the same simulation speed.
  step(scrollFade: number) {
    const fade = Math.min(1, Math.max(0, scrollFade)) ** 2;
    const strength = 1 - fade;
    if (this.moved) {
      const dx = this.pointer.x - this.previous.x,
        dy = this.pointer.y - this.previous.y;
      if (Math.hypot(dx, dy) > 0 && strength > 0.001) {
        const u = this.splat.uniforms;
        u.uAspectRatio.value = this.aspect;
        u.uPoint.value.copy(this.pointer);
        u.uTarget.value = this.velocity.read.texture;
        u.uColor.value.set(
          dx * FLUID_SETTINGS.splatForce * strength,
          dy * FLUID_SETTINGS.splatForce * strength,
          0,
        );
        this.renderPass(this.splat, this.velocity.write);
        this.velocity.swap();
        u.uTarget.value = this.dye.read.texture;
        u.uColor.value.set(strength, strength, strength);
        this.renderPass(this.splat, this.dye.write);
        this.dye.swap();
      }
      this.previous.copy(this.pointer);
      this.moved = false;
    }
    const a = this.advect.uniforms;
    a.uVelocity.value = this.velocity.read.texture;
    a.uSource.value = this.velocity.read.texture;
    a.uTexelSize.value = this.simTexel;
    a.uDissipation.value = FLUID_SETTINGS.velocityDissipation;
    this.renderPass(this.advect, this.velocity.write);
    this.velocity.swap();
    a.uVelocity.value = this.velocity.read.texture;
    a.uSource.value = this.dye.read.texture;
    a.uTexelSize.value = this.dyeTexel;
    a.uDissipation.value =
      FLUID_SETTINGS.dyeDissipation +
      (0.97 - FLUID_SETTINGS.dyeDissipation) * fade;
    this.renderPass(this.advect, this.dye.write);
    this.dye.swap();
    this.divergencePass.uniforms.uVelocity.value = this.velocity.read.texture;
    this.renderPass(this.divergencePass, this.divergence);
    this.renderer.setRenderTarget(this.pressure.read);
    this.renderer.clear();
    for (let i = 0; i < FLUID_SETTINGS.pressureIterations; i++) {
      this.pressurePass.uniforms.uPressure.value = this.pressure.read.texture;
      this.renderPass(this.pressurePass, this.pressure.write);
      this.pressure.swap();
    }
    this.gradient.uniforms.uPressure.value = this.pressure.read.texture;
    this.gradient.uniforms.uVelocity.value = this.velocity.read.texture;
    this.renderPass(this.gradient, this.velocity.write);
    this.velocity.swap();
  }

  draw() {
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    this.reveal.uniforms.uDye.value = this.dye.read.texture;
    this.reveal.uniforms.uVideoAspect.value =
      this.video.videoWidth / this.video.videoHeight;
    this.renderPass(this.reveal, null);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.targets.forEach((target) => target.dispose());
    this.materials.forEach((material) => material.dispose());
    this.geometry.dispose();
    this.videoTexture.dispose();
    this.scene.clear();
    this.renderer.dispose();
  }
}
