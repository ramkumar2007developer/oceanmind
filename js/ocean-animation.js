/* ==========================================================================
   OCEANMIND - OCEAN CANVAS ANIMATION ENGINE (js/ocean-animation.js)
   Renders dynamic layered ocean waves, swimming fish & dolphins, flying seagulls,
   floating boat, ambient particles, and stats counter animator.
   ========================================================================== */

class OceanCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.fishes = [];
    this.dolphins = [];
    this.seagulls = [];
    this.waveOffset = 0;
    this.boatX = 0;
    
    this.init();
    this.bindEvents();
    this.animate();
  }

  init() {
    this.resize();
    this.createParticles(45);
    this.createFishes(8);
    this.createDolphins(4);
    this.createSeagulls(6);
    
    this.boatX = this.width * 0.2;
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    this.width = this.canvas.parentElement.clientWidth || window.innerWidth;
    this.height = this.canvas.parentElement.clientHeight || window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  createParticles(count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        speedY: -Math.random() * 0.5 - 0.2,
        speedX: (Math.random() - 0.5) * 0.4
      });
    }
  }

  createFishes(count) {
    for (let i = 0; i < count; i++) {
      this.fishes.push({
        x: Math.random() * this.width,
        y: this.height * (0.65 + Math.random() * 0.25),
        speed: Math.random() * 1.5 + 0.8,
        size: Math.random() * 8 + 10,
        color: Math.random() > 0.5 ? '#1DE9FF' : '#00B4FF'
      });
    }
  }

  createDolphins(count) {
    for (let i = 0; i < count; i++) {
      this.dolphins.push({
        x: Math.random() * this.width,
        y: this.height * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.2 + 0.6,
        jumpHeight: Math.random() * 45 + 35
      });
    }
  }

  createSeagulls(count) {
    for (let i = 0; i < count; i++) {
      this.seagulls.push({
        x: Math.random() * this.width,
        y: this.height * (0.1 + Math.random() * 0.25),
        speed: Math.random() * 1.8 + 1,
        wingPhase: Math.random() * Math.PI * 2
      });
    }
  }

  drawWaves() {
    this.waveOffset += 0.025;
    const ctx = this.ctx;

    // Layer 1: Deep Navy Base Wave
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (let x = 0; x <= this.width; x += 10) {
      const y = Math.sin(x * 0.005 + this.waveOffset) * 18 + Math.cos(x * 0.01 + this.waveOffset) * 8 + this.height * 0.65;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.fillStyle = 'rgba(14, 42, 71, 0.45)';
    ctx.fill();

    // Layer 2: Shimmering Cyan Top Wave
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (let x = 0; x <= this.width; x += 10) {
      const y = Math.cos(x * 0.008 - this.waveOffset) * 14 + Math.sin(x * 0.004 + this.waveOffset) * 10 + this.height * 0.72;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.fillStyle = 'rgba(0, 180, 255, 0.25)';
    ctx.fill();
  }

  drawBoat() {
    this.boatX += 0.45;
    if (this.boatX > this.width + 60) this.boatX = -60;

    const ctx = this.ctx;
    const boatY = Math.sin(this.boatX * 0.01 + this.waveOffset) * 8 + this.height * 0.62;

    ctx.save();
    ctx.translate(this.boatX, boatY);
    
    // Boat Hull
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.lineTo(25, 0);
    ctx.lineTo(18, 12);
    ctx.lineTo(-20, 12);
    ctx.closePath();
    ctx.fillStyle = '#00B4FF';
    ctx.fill();
    ctx.strokeStyle = '#1DE9FF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cabin
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-10, -12, 16, 12);

    // Signal Mast & Green Beacon
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -22);
    ctx.strokeStyle = '#94A3B8';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -23, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#12D18E';
    ctx.fill();

    ctx.restore();
  }

  drawFishes() {
    const ctx = this.ctx;
    this.fishes.forEach(fish => {
      fish.x += fish.speed;
      if (fish.x > this.width + 30) fish.x = -30;

      ctx.save();
      ctx.translate(fish.x, fish.y);
      ctx.fillStyle = fish.color;
      ctx.globalAlpha = 0.5;
      
      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, fish.size, fish.size / 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(-fish.size, 0);
      ctx.lineTo(-fish.size - 6, -5);
      ctx.lineTo(-fish.size - 6, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }

  drawDolphins() {
    const ctx = this.ctx;
    this.dolphins.forEach(dolphin => {
      dolphin.x += dolphin.speed;
      if (dolphin.x > this.width + 50) dolphin.x = -50;
      
      dolphin.phase += 0.03;
      const arcY = Math.sin(dolphin.phase) * dolphin.jumpHeight;

      if (arcY < 0) { // Only render when leaping above water
        ctx.save();
        ctx.translate(dolphin.x, dolphin.y + arcY);
        ctx.fillStyle = '#1DE9FF';
        ctx.globalAlpha = 0.7;

        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 6, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    });
  }

  drawSeagulls() {
    const ctx = this.ctx;
    this.seagulls.forEach(gull => {
      gull.x += gull.speed;
      if (gull.x > this.width + 40) gull.x = -40;

      gull.wingPhase += 0.1;
      const wingY = Math.sin(gull.wingPhase) * 6;

      ctx.save();
      ctx.translate(gull.x, gull.y);
      ctx.strokeStyle = 'rgba(240, 246, 252, 0.6)';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.moveTo(-10, wingY);
      ctx.quadraticCurveTo(-5, -wingY, 0, 0);
      ctx.quadraticCurveTo(5, -wingY, 10, wingY);
      ctx.stroke();

      ctx.restore();
    });
  }

  drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < 0) p.y = this.height;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(29, 233, 255, ${p.alpha})`;
      ctx.fill();
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawParticles();
    this.drawFishes();
    this.drawDolphins();
    this.drawWaves();
    this.drawBoat();
    this.drawSeagulls();

    requestAnimationFrame(() => this.animate());
  }
}

// Auto Instantiate Canvas & Stats Counters
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('ocean-canvas')) {
    new OceanCanvasEngine('ocean-canvas');
  }
  if (document.getElementById('auth-canvas')) {
    new OceanCanvasEngine('auth-canvas');
  }

  // Statistic Counter Animator
  const counters = document.querySelectorAll('.stat-number[data-target]');
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'));
    if (!target) return;

    let count = 0;
    const increment = Math.ceil(target / 60);
    const updateCount = () => {
      count += increment;
      if (count < target) {
        counter.innerText = count.toLocaleString() + '+';
        setTimeout(updateCount, 25);
      } else {
        counter.innerText = target.toLocaleString() + '+';
      }
    };
    updateCount();
  });
});
