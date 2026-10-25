import * as THREE from 'three';
import { 
  createGlowParticleTexture, 
  THEME_PALETTES, 
  prefersReducedMotion 
} from './webglUtils';

export class BackgroundScene {
  constructor(canvas, theme = 'light') {
    this.canvas = canvas;
    this.currentTheme = theme;
    this.isReducedMotion = prefersReducedMotion();
    this.isPaused = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;

    // Mouse parallax tracking
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    const palette = THEME_PALETTES[this.currentTheme] || THEME_PALETTES.light;

    // 2. Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 15);

    // 3. Ultra-lightweight Renderer (1.0x pixel ratio, no antialias needed for background)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'default',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1.0); // 1.0x saves 75% GPU fill-rate vs high-dpi

    // 4. Floating Crystals (Using lightweight MeshBasicMaterial)
    this.createFloatingShapes(palette);

    // 5. Floating Stardust Particles
    this.createFloatingParticles(palette);

    // 6. Event Listeners
    this.bindEvents();

    // 7. Start Loop
    this.startTime = performance.now();
    this.animate();
  }

  createFloatingShapes(palette) {
    this.shapesGroup = new THREE.Group();
    this.shapes = [];

    // Lean count: 4 on mobile, 7 on desktop
    const count = window.innerWidth < 768 ? 4 : 7;
    const geometries = [
      new THREE.IcosahedronGeometry(1.2, 0),
      new THREE.OctahedronGeometry(1.1, 0),
      new THREE.TetrahedronGeometry(1.1, 0),
    ];

    for (let i = 0; i < count; i++) {
      const geom = geometries[i % geometries.length];
      const colorHex = palette.crystals[i % palette.crystals.length];
      
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: this.currentTheme === 'dark' ? 0.45 : 0.18,
        wireframe: i % 2 === 0,
      });

      const mesh = new THREE.Mesh(geom, mat);

      // Distribute in 3D volume strictly towards left/right peripheral edges
      // so shapes never sit under the stats cards, filter bar or calendar controls
      const side = (i % 2 === 0) ? 1 : -1;
      const posX = side * (9.5 + (i * 1.8) % 5.5);
      const posY = ((i % 4) - 1.5) * 4.2;
      const posZ = -1.5 + (i % 3) * 1.2;

      mesh.position.set(posX, posY, posZ);

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.shapes.push({
        mesh,
        rotSpeedX: (Math.random() - 0.5) * 0.005,
        rotSpeedY: (Math.random() - 0.5) * 0.005,
        floatSpeed: 0.2 + Math.random() * 0.3,
        floatOffset: Math.random() * Math.PI * 2,
        initialY: mesh.position.y,
      });

      this.shapesGroup.add(mesh);
    }

    this.scene.add(this.shapesGroup);
  }

  createFloatingParticles(palette) {
    const textureCanvas = createGlowParticleTexture();
    this.particleTexture = new THREE.CanvasTexture(textureCanvas);

    // Lean particle count: 20 on mobile, 40 on desktop
    const particleCount = window.innerWidth < 768 ? 20 : 40;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const c1 = new THREE.Color(0x10b981); // emerald
    const c2 = new THREE.Color(0x059669); // dark emerald
    const c3 = new THREE.Color(0x8b5cf6); // violet
    const c4 = new THREE.Color(0x0d9488); // teal

    const colorChoices = [c1, c2, c3, c4];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const chosenColor = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 2.2,
      map: this.particleTexture,
      transparent: true,
      opacity: this.currentTheme === 'dark' ? 0.75 : 0.55,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    const palette = THEME_PALETTES[theme] || THEME_PALETTES.light;

    if (this.particleMaterial) {
      this.particleMaterial.opacity = theme === 'dark' ? 0.75 : 0.38;
    }

    if (this.shapes) {
      this.shapes.forEach((item, idx) => {
        const mat = item.mesh.material;
        const colorHex = palette.crystals[idx % palette.crystals.length];
        mat.color.setHex(colorHex);
        mat.opacity = theme === 'dark' ? 0.45 : 0.18;
      });
    }
  }

  bindEvents() {
    this.onMouseMove = (e) => {
      if (this.isReducedMotion) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouse.targetX = x * 0.5;
      this.mouse.targetY = y * 0.35;
    };

    this.onResize = () => {
      if (!this.renderer || !this.camera) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(1.0);
    };

    this.onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.pause();
      } else {
        this.resume();
      }
    };

    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.startTime = performance.now() - (this.lastElapsed || 0) * 1000;
      this.animate();
    }
  }

  animate = () => {
    if (this.isPaused) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    // Frame rate throttle: ~35-40 FPS for calm background ambiance
    // Saves 50%+ CPU/GPU usage compared to uncapped 144Hz/60Hz loops
    const now = performance.now();
    if (now - this.lastFrameTime < 26) {
      return;
    }
    this.lastFrameTime = now;

    const elapsedTime = (now - this.startTime) * 0.001;
    this.lastElapsed = elapsedTime;

    // 1. Smooth Camera Parallax / Drift
    if (!this.isReducedMotion) {
      if (this.isTouchDevice) {
        const driftX = Math.sin(elapsedTime * 0.2) * 0.4;
        const driftY = Math.cos(elapsedTime * 0.15) * 0.25;
        this.camera.position.x += (driftX - this.camera.position.x) * 0.02;
        this.camera.position.y += (driftY - this.camera.position.y) * 0.02;
      } else {
        this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.03;
        this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.03;
        this.camera.position.x = this.mouse.x;
        this.camera.position.y = this.mouse.y;
      }
      this.camera.lookAt(0, 0, 0);
    }

    // 2. Animate Crystals
    if (this.shapes) {
      this.shapes.forEach((item) => {
        item.mesh.rotation.x += item.rotSpeedX;
        item.mesh.rotation.y += item.rotSpeedY;
        item.mesh.position.y = item.initialY + Math.sin(elapsedTime * item.floatSpeed + item.floatOffset) * 0.3;
      });
    }

    // 3. Animate Particles
    if (this.particles) {
      this.particles.rotation.y = elapsedTime * 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  };

  destroy() {
    this.pause();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (this.shapes) {
      this.shapes.forEach((item) => {
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
      });
    }

    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }

    if (this.particleTexture) {
      this.particleTexture.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
