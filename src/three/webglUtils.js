/**
 * WebGL and 3D utility helpers
 */

// Check if WebGL is supported by the client browser
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// Check if user prefers reduced motion
export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Generate high quality soft-glow particle circle texture procedurally
export function createGlowParticleTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const center = size / 2;
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);

  // Soft glowing orb gradient
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.45)');
  gradient.addColorStop(0.8, 'rgba(16, 185, 129, 0.1)');
  gradient.addColorStop(1.0, 'rgba(16, 185, 129, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

// Generate star/sparkle texture for celebration bursts
export function createStarParticleTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const center = size / 2;
  ctx.translate(center, center);

  // Draw 4-point sparkle star
  ctx.beginPath();
  const points = 4;
  const outerRadius = 28;
  const innerRadius = 7;
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, '#34d399');
  gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

  ctx.fillStyle = gradient;
  ctx.fill();

  return canvas;
}

// Color palettes for themes
export const THEME_PALETTES = {
  dark: {
    bg: 0x090d16,
    fog: 0x090d16,
    ambient: 0x1e293b,
    crystals: [0x10b981, 0x14b8a6, 0x8b5cf6, 0x3b82f6],
    particles: [0x34d399, 0x6ee7b7, 0xa78bfa, 0x60a5fa],
    particleOpacity: 0.85,
  },
  light: {
    bg: 0xf8fafc,
    fog: 0xf8fafc,
    ambient: 0xffffff,
    crystals: [0x34d399, 0x5eead4, 0xa78bfa, 0x93c5fd],
    particles: [0x10b981, 0x34d399, 0xa78bfa, 0x60a5fa],
    particleOpacity: 0.38,
  }
};
