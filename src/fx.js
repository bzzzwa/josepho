// fx.js - little bits of life: dust, sparks, brick chips, splashes and the rings a waking prism sends out.

import { C } from './colors.js';

const MAX_PARTICLES = 260;

export class Fx {
    parts = [];
    rings = [];
    shake = 0;
    reducedMotion = false;

    clear() {
        this.parts.length = 0;
        this.rings.length = 0;
        this.shake = 0;
    }

    add(p) {
        if (this.parts.length >= MAX_PARTICLES) {
            this.parts.shift();
        }
        p.age = 0;
        p.g ??= 0;
        p.drag ??= 1;
        this.parts.push(p);
        return p;
    }

    /** Single pixels flying outward. */
    burst(x, y, count, colors, speed = 1.2, gravity = 0.05, life = 30) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = speed * (0.4 + Math.random() * 0.8);
            this.add({
                kind: 'px',
                x,
                y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s - speed * 0.3,
                g: gravity,
                drag: 0.96,
                life: life + Math.floor(Math.random() * 12),
                color: colors[i % colors.length],
            });
        }
    }

    /** Spectrum sparks: their color slides through the rainbow slots as they age. */
    sparks(x, y, count, speed = 1.6) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const s = speed * (0.6 + Math.random() * 0.6);
            this.add({
                kind: 'spark',
                x,
                y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                g: 0.02,
                drag: 0.95,
                life: 40 + Math.floor(Math.random() * 20),
                hue: i % 6,
            });
        }
    }

    dust(x, y, dir = 0) {
        this.add({ kind: 'dust', x: x - 2, y: y - 2, vx: dir * 0.3, vy: -0.15, life: 15, color: C.GHOST });
    }

    chips(x, y) {
        for (const [vx, vy] of [
            [-0.9, -2.6],
            [0.9, -2.6],
            [-0.6, -1.6],
            [0.6, -1.6],
        ]) {
            this.add({ kind: 'chip', x, y, vx, vy, g: 0.18, life: 60 });
        }
        this.kick(2);
    }

    splash(x, y) {
        for (let i = 0; i < 14; i++) {
            this.add({
                kind: 'px',
                x: x + (Math.random() - 0.5) * 6,
                y,
                vx: (Math.random() - 0.5) * 1.4,
                vy: -1 - Math.random() * 1.8,
                g: 0.12,
                life: 40,
                color: i % 3 ? C.WATER_FOAM : C.WATER0 + 2,
            });
        }
    }

    ring(x, y, speed, color, life, thick = 1) {
        this.rings.push({ x, y, r: 0, speed, color, life, age: 0, thick });
    }

    kick(amount) {
        if (!this.reducedMotion) {
            this.shake = Math.max(this.shake, amount);
        }
    }

    update() {
        for (const p of this.parts) {
            p.age++;
            p.vx *= p.drag;
            p.vy = p.vy * p.drag + p.g;
            p.x += p.vx;
            p.y += p.vy;
        }
        this.parts = this.parts.filter((p) => p.age < p.life);
        for (const r of this.rings) {
            r.age++;
            r.r += r.speed;
            r.speed *= 0.985;
        }
        this.rings = this.rings.filter((r) => r.age < r.life);
        if (this.shake > 0) {
            this.shake = Math.max(0, this.shake - 0.25);
        }
    }

    render(gfx, camX, camY) {
        for (const r of this.rings) {
            const fading = r.age > r.life * 0.6;
            const n = Math.min(160, Math.max(16, Math.floor(r.r * 2.2)));
            for (let i = 0; i < n; i++) {
                if (fading && (i + r.age) % 2) {
                    continue;
                }
                const a = (i / n) * Math.PI * 2;
                for (let t = 0; t < r.thick; t++) {
                    gfx.pixel(r.x + Math.cos(a) * (r.r - t) - camX, r.y + Math.sin(a) * (r.r - t) - camY, r.color);
                }
            }
        }
        for (const p of this.parts) {
            const x = p.x - camX;
            const y = p.y - camY;
            if (x < -8 || x > 200 || y < -8 || y > 116) {
                continue;
            }
            const fade = p.age / p.life;
            switch (p.kind) {
                case 'px':
                    if (fade < 0.8 || p.age % 2 === 0) {
                        gfx.pixel(x, y, p.color);
                    }
                    break;
                case 'spark': {
                    const slot = C.SPEC0 + ((p.hue + Math.floor(p.age / 4)) % 6);
                    gfx.pixel(x, y, fade > 0.7 ? C.MOTE_HI : slot);
                    if (fade < 0.4) {
                        gfx.pixel(x - p.vx, y - p.vy, slot);
                    }
                    break;
                }
                case 'dust':
                    gfx.draw(`dust${Math.min(2, Math.floor(fade * 3))}`, x, y, p.color - C.WHITE);
                    break;
                case 'chip':
                    gfx.draw('chip', x, y);
                    break;
            }
        }
    }
}
