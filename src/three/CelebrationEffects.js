/**
 * Celebration 3D / Particle Effects Manager
 * Handles burst effects when completing daily study items (all 3 done)
 * and grand celebrations when reaching 100% monthly progress.
 */
import { prefersReducedMotion } from './webglUtils';

class CelebrationManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.isAnimating = false;
    this.animId = null;
  }

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.handleResize = () => {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    };
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Trigger burst celebration near a target element or coordinates
   * @param {number} x - Screen X coordinate
   * @param {number} y - Screen Y coordinate
   * @param {string} type - 'day_complete' | 'month_grand'
   */
  burst(x, y, type = 'day_complete') {
    if (prefersReducedMotion() || !this.ctx) return;

    const count = type === 'month_grand' ? 120 : 45;
    const colors = [
      '#10b981', // emerald
      '#34d399', // mint
      '#fbbf24', // amber/gold
      '#60a5fa', // sky blue
      '#a78bfa', // purple
      '#f43f5e', // rose
    ];

    const originX = x || window.innerWidth / 2;
    const originY = y || window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'month_grand' 
        ? 3 + Math.random() * 9 
        : 2 + Math.random() * 6;

      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'month_grand' ? 3 : 1.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: type === 'month_grand' ? 4 + Math.random() * 5 : 3 + Math.random() * 4,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        gravity: 0.18,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.5 ? 'star' : 'circle',
      });
    }

    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  animate = () => {
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.alpha -= p.decay;
      p.rotation += p.rotSpeed;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.shape === 'star') {
        // Draw small sparkle star
        this.drawSparkle(p.size);
      } else {
        // Draw confetti square or circular dot
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(this.animate);
    } else {
      this.isAnimating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  };

  drawSparkle(size) {
    this.ctx.beginPath();
    const spikes = 4;
    const outer = size * 1.5;
    const inner = size * 0.4;
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (i * Math.PI) / spikes;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.handleResize) window.removeEventListener('resize', this.handleResize);
    this.particles = [];
    this.isAnimating = false;
  }
}

export const celebrationManager = new CelebrationManager();
