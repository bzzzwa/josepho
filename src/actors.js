// actors.js - Josepho, the creatures, and every object you can touch.
//
// All positions are in subpixels (see world.js: SUB = 16 per pixel) and describe the top-left of the
// collision box. Sprites are drawn centered on the box, feet on its bottom edge.

import { C } from './colors.js';
import { isGrounded, moveBody, SUB, TILE } from './world.js';

// ---------------------------------------------------------------------------------------------- tuning

export const PHYS = {
    walkMax: 16, // 1 pixel per frame
    runMax: 26,
    accel: 1,
    skid: 3,
    friction: 1,
    gravityHold: 2, // rising while jump is held
    gravity: 6, // everything else
    maxFall: 56,
    jumpBase: 48,
    jumpRunBonus: 0.3, // faster running -> higher jump
    coyote: 6,
    buffer: 6,
    flutterMax: 72, // frames of flutter per jump
    flutterFall: 5, // slow sinking speed while fluttering
    stompBounce: 44,
    springPower: 70,
    // swimming (in water whose color is on)
    swimMax: 12, // slower than walking
    swimGravity: 1,
    swimSink: 14, // fastest sinking speed
    swimStroke: 28, // one press of jump underwater
    swimLeap: 52, // a stroke with the head out of the water: enough to climb onto a 1-tile shore
};

// ---------------------------------------------------------------------------------------------- Josepho

export class Player {
    w = 6;
    h = 10;

    constructor(x, y) {
        this.reset(x, y);
    }

    reset(x, y) {
        this.x = x * SUB;
        this.y = y * SUB;
        this.vx = 0;
        this.vy = 0;
        this.facing = 1;
        this.onGround = false;
        this.coyote = 0;
        this.buffer = 0;
        this.jumping = false;
        this.fluttering = false;
        this.flutterFuel = PHYS.flutterMax;
        this.canFlutter = false;
        this.spring = false;
        this.glow = false;
        this.invuln = 0;
        this.dead = false;
        this.deadTimer = 0;
        this.deathCause = null;
        this.anim = 0;
        this.blink = 0;
        this.landSquash = 0;
        this.happy = false;
        this.inWater = false;
        this.platform = null; // driftwood Josepho stands on
        this.prevBottom = this.y + this.h * SUB;
    }

    get px() {
        return Math.floor(this.x / SUB);
    }

    get py() {
        return Math.floor(this.y / SUB);
    }

    get cx() {
        return this.px + this.w / 2;
    }

    get bottom() {
        return this.py + this.h;
    }

    /** @param {object} inp  @param {import('./game.js').Game} game */
    update(inp, game) {
        const level = game.level;
        if (this.dead) {
            this.deadTimer++;
            if (this.deathCause !== 'water' && this.deadTimer > 20) {
                this.vy = Math.min(this.vy + 3, PHYS.maxFall);
                this.y += this.vy;
            }
            return;
        }
        if (this.happy) {
            this.vx = 0;
            this.anim++;
            return;
        }

        this.prevBottom = this.bottom;
        const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        const wasInWater = this.inWater;
        this.inWater = level.isWater(this.cx, this.py + 6);
        if (this.inWater !== wasInWater && Math.abs(this.vy) > 8) {
            game.fx.splash(this.cx, this.py + 6);
            game.sound.play('splash', { volume: 0.5 });
        }
        const max = this.inWater ? PHYS.swimMax : inp.run ? PHYS.runMax : PHYS.walkMax;

        // horizontal
        if (dir !== 0) {
            this.facing = dir;
            if (this.onGround && Math.sign(this.vx) === -dir && this.vx !== 0) {
                this.vx += dir * PHYS.skid;
                if (Math.abs(this.vx) > 6 && game.tick % 4 === 0) {
                    game.fx.dust(this.cx, this.bottom, -dir);
                }
            } else if (Math.abs(this.vx) < max || Math.sign(this.vx) !== dir) {
                this.vx += dir * PHYS.accel;
            } else if (this.onGround || this.inWater) {
                // slow down gently when letting go of run
                this.vx -= Math.sign(this.vx) * PHYS.friction;
            }
        } else if (this.onGround || this.inWater) {
            if (Math.abs(this.vx) <= PHYS.friction) {
                this.vx = 0;
            } else {
                this.vx -= Math.sign(this.vx) * PHYS.friction;
            }
        }

        // jump: buffered presses and a little "coyote time" after running off a ledge
        if (inp.jumpPressed) {
            this.buffer = PHYS.buffer;
        } else if (this.buffer > 0) {
            this.buffer--;
        }
        this.coyote = this.onGround ? PHYS.coyote : Math.max(0, this.coyote - 1);

        let dropThrough = false;
        if (this.inWater) {
            // swimming: every press is a stroke; with the head above the surface it is a leap out
            if (inp.jumpPressed) {
                const headOut = !level.isWater(this.cx, this.py - 1);
                this.vy = -(headOut ? PHYS.swimLeap : PHYS.swimStroke);
                this.jumping = headOut;
                this.buffer = 0;
                this.onGround = false;
                game.sound.play('flutter', { pitch: 0.6 });
                game.fx.add({ kind: 'px', x: this.cx, y: this.py + 2, vx: 0, vy: -0.4, life: 40, color: C.WATER_FOAM });
            }
            this.fluttering = false;
            this.coyote = 0;
        } else if (this.buffer > 0 && this.coyote > 0) {
            if (inp.down && this.onGround && level.onOneWay(this.px, this.py, this.w, this.h)) {
                dropThrough = true;
                this.y += SUB;
            } else {
                this.vy = -(PHYS.jumpBase + Math.floor(Math.abs(this.vx) * PHYS.jumpRunBonus));
                this.jumping = true;
                this.canFlutter = true;
                game.sound.play('jump');
            }
            this.buffer = 0;
            this.coyote = 0;
            this.onGround = false;
        } else if (inp.jumpPressed && !this.onGround && this.flutterFuel > 0) {
            // a second press in the air opens the wings
            this.fluttering = true;
            this.canFlutter = true;
        }
        if (!inp.jump) {
            this.fluttering = false;
            this.jumping = false;
        }

        // gravity
        let g = PHYS.gravity;
        if (this.vy < 0 && (this.jumping || this.spring)) {
            g = PHYS.gravityHold;
        }
        if (this.vy >= 0) {
            this.spring = false;
        }
        if (this.inWater) {
            // water holds Josepho up: slow sinking, strokes slow down quickly
            this.vy = Math.max(-PHYS.swimLeap, Math.min(this.vy + PHYS.swimGravity, PHYS.swimSink));
            if (this.vy < 0 && !this.jumping) {
                this.vy += 1;
            }
            if (game.tick % 50 === 0) {
                game.fx.add({ kind: 'px', x: this.cx + this.facing * 2, y: this.py + 1, vx: 0, vy: -0.3, life: 45, color: C.WATER_FOAM });
            }
        } else {
            this.vy = Math.min(this.vy + g, PHYS.maxFall);
        }
        if (this.fluttering && this.flutterFuel > 0 && this.vy > -8) {
            this.flutterFuel--;
            this.vy = Math.max(this.vy - 9, Math.min(this.vy, PHYS.flutterFall));
            if (this.flutterFuel % 10 === 0) {
                game.sound.play('flutter');
            }
            if (this.flutterFuel % 5 === 0) {
                game.fx.add({ kind: 'px', x: this.cx - this.facing * 4, y: this.py + 5, vx: -this.facing * 0.3, vy: 0.4, life: 18, color: C.MOTE });
            }
        } else if (this.flutterFuel <= 0) {
            this.fluttering = false;
        }

        // move
        const wasGround = this.onGround;
        const res = moveBody(level, this, dropThrough);
        if (res.hitX) {
            this.vx = 0;
        }
        if (res.hitUp) {
            this.vy = 0;
            this.jumping = false;
            game.headBump(this);
        }
        if (res.landed) {
            this.vy = 0;
        }
        this.onGround = res.landed || (this.vy >= 0 && isGrounded(level, this));
        if (this.onGround) {
            this.flutterFuel = PHYS.flutterMax;
            this.fluttering = false;
            this.canFlutter = false;
            if (!wasGround) {
                this.landSquash = 4;
                game.fx.dust(this.cx - 3, this.bottom, -1);
                game.fx.dust(this.cx + 3, this.bottom, 1);
            }
        }

        // running dust
        if (this.onGround && Math.abs(this.vx) >= PHYS.runMax - 2 && game.tick % 6 === 0) {
            game.fx.dust(this.cx - this.facing * 3, this.bottom, -this.facing);
        }

        if (this.invuln > 0) {
            this.invuln--;
        }
        if (this.landSquash > 0) {
            this.landSquash--;
        }
        this.anim += Math.max(1, Math.abs(this.vx) / 8);
        this.blink = (this.blink + 1) % 190;

        // hazards and falling out of the world
        const hz = level.hazard(this.px, this.py, this.w, this.h);
        if (hz) {
            game.killPlayer(hz);
        } else if (this.py > level.ph + 8) {
            game.killPlayer('pit');
        }
    }

    hurt(game) {
        if (this.invuln > 0 || this.dead) {
            return;
        }
        if (this.glow) {
            this.glow = false;
            this.invuln = 110;
            game.sound.play('hurt');
            game.fx.burst(this.cx, this.py + 5, 16, [C.MOTE, C.MOTE_HI], 1.4);
            game.fx.kick(2);
            return;
        }
        game.killPlayer('hit');
    }

    frameName() {
        if (this.dead) {
            return 'j.hurt';
        }
        if (this.happy) {
            return Math.floor(this.anim / 20) % 2 ? 'j.happy' : 'j.idle0';
        }
        if (this.inWater && !this.onGround) {
            // paddling with the wings of light
            return Math.floor(this.anim / 10) % 2 ? 'j.flutter0' : 'j.flutter1';
        }
        if (!this.onGround) {
            if (this.fluttering && this.flutterFuel > 0) {
                return Math.floor(this.anim / 3) % 2 ? 'j.flutter0' : 'j.flutter1';
            }
            return this.vy < 0 ? 'j.jump' : 'j.fall';
        }
        if (this.vx !== 0) {
            return ['j.run0', 'j.run1', 'j.run2', 'j.run1'][Math.floor(this.anim / 5) % 4];
        }
        if (this.blink > 182) {
            return 'j.blink';
        }
        return this.anim % 80 < 40 ? 'j.idle0' : 'j.idle1';
    }

    render(gfx, camX, camY, tick) {
        if (this.invuln > 0 && Math.floor(this.invuln / 3) % 2 === 0) {
            return;
        }
        let name = this.frameName();
        if (this.facing < 0 && !this.dead) {
            name += '<';
        }
        const w = gfx.width(name);
        const h = gfx.height(name);
        const x = Math.round(this.px + this.w / 2 - w / 2) - camX;
        let y = this.bottom - h - camY;
        if (this.landSquash > 2) {
            y += 1;
        }
        if (this.glow) {
            const aura = `${name}~`;
            const color = tick % 8 < 4 ? C.MOTE : C.MOTE_HI;
            gfx.tint(aura, x - 1, y - 1, color);
        }
        gfx.draw(name, x, y);
    }
}

// ---------------------------------------------------------------------------------------------- creatures

class Walker {
    alive = true;
    state = 'walk'; // walk | squash | flip
    timer = 0;
    active = false;
    anim = 0;

    constructor(tx, ty, w, h, speed) {
        this.w = w;
        this.h = h;
        this.speed = speed;
        this.x = (tx * TILE + Math.floor((TILE - w) / 2)) * SUB;
        this.y = ((ty + 1) * TILE - h) * SUB;
        this.vx = -speed;
        this.vy = 0;
    }

    get px() {
        return Math.floor(this.x / SUB);
    }

    get py() {
        return Math.floor(this.y / SUB);
    }

    update(game) {
        const level = game.level;
        if (!this.active) {
            if (this.px < game.camX + 192 + 24 && this.px > game.camX - 40) {
                this.active = true;
            } else {
                return;
            }
        }
        this.anim++;
        if (this.state === 'squash') {
            this.timer++;
            if (this.timer > 30) {
                this.alive = false;
            }
            return;
        }
        if (this.state === 'flip') {
            this.vy = Math.min(this.vy + 4, PHYS.maxFall);
            this.x += this.vx;
            this.y += this.vy;
            if (this.py > level.ph + 20) {
                this.alive = false;
            }
            return;
        }
        this.vy = Math.min(this.vy + 5, 48);
        const res = moveBody(level, this);
        if (res.hitX) {
            this.vx = -this.vx;
        }
        if (res.landed) {
            this.vy = 0;
            if (this.turnsAtLedges) {
                const ahead = this.vx > 0 ? this.px + this.w : this.px - 1;
                if (!level.collides(ahead, this.py + this.h, 1, 1, true)) {
                    this.vx = -this.vx;
                }
            }
        }
        if (this.py > level.ph + 20) {
            this.alive = false;
        }
    }

    overlaps(p) {
        return p.px < this.px + this.w && p.px + p.w > this.px && p.py < this.py + this.h && p.py + p.h > this.py;
    }

    flip(game, dir) {
        this.state = 'flip';
        this.vy = -40;
        this.vx = dir * 10;
        game.fx.burst(this.px + this.w / 2, this.py + this.h / 2, 8, [C.GREY_LT, C.WHITE], 1);
    }
}

export class Greyling extends Walker {
    stompable = true;
    turnsAtLedges = false;

    constructor(tx, ty) {
        super(tx, ty, 8, 7, 6);
    }

    update(game) {
        super.update(game);
        // they exhale grey vapor: the color they drank
        if (this.active && this.state === 'walk' && this.anim % 40 === 0) {
            game.fx.add({ kind: 'px', x: this.px + 2 + (this.anim % 5), y: this.py - 1, vx: 0, vy: -0.25, life: 30, color: C.GREY_LT });
        }
    }

    render(gfx, camX, camY) {
        const x = this.px - 1 - camX;
        const y = this.py + this.h - 8 - camY;
        if (this.state === 'squash') {
            gfx.draw('greylingFlat', x, y);
            return;
        }
        let name = Math.floor(this.anim / 10) % 2 ? 'greyling1' : 'greyling0';
        if (this.vx > 0) {
            name += '<';
        }
        if (this.state === 'flip') {
            gfx.draw(name, x, y - 2);
            return;
        }
        gfx.draw(name, x, y);
    }
}

export class Thornback extends Walker {
    stompable = false;
    turnsAtLedges = true;

    constructor(tx, ty) {
        super(tx, ty, 8, 8, 4);
    }

    render(gfx, camX, camY) {
        let name = Math.floor(this.anim / 12) % 2 ? 'thorn1' : 'thorn0';
        if (this.vx > 0) {
            name += '<';
        }
        gfx.draw(name, this.px - 1 - camX, this.py + this.h - 9 - camY);
    }
}

// ---------------------------------------------------------------------------------------------- objects

export class Mote {
    taken = false;

    constructor(tx, ty) {
        this.x = tx * TILE + 1;
        this.y = ty * TILE + 1;
        this.phase = (tx * 7 + ty * 3) % 32;
    }

    hits(p) {
        return p.px < this.x + 7 && p.px + p.w > this.x - 1 && p.py < this.y + 7 && p.py + p.h > this.y - 1;
    }

    render(gfx, camX, camY, tick) {
        const f = Math.floor((tick + this.phase) / 8) % 4;
        const bob = Math.round(Math.sin((tick + this.phase * 4) * 0.08));
        gfx.draw(`mote${f}`, this.x - camX, this.y + bob - camY);
    }
}

/** A mote that pops out of a prism block and is collected at once. */
export class PopMote {
    alive = true;
    t = 0;

    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vy = -3.2;
    }

    update() {
        this.t++;
        this.y += this.vy;
        this.vy += 0.22;
        if (this.t > 24) {
            this.alive = false;
        }
    }

    render(gfx, camX, camY) {
        gfx.draw(`mote${Math.floor(this.t / 3) % 4}`, this.x - camX, this.y - camY);
    }
}

/** The glow petal: rises out of its block, then floats until Josepho takes it. */
export class Petal {
    alive = true;
    t = 0;

    constructor(tx, ty) {
        this.x = tx * TILE;
        this.baseY = ty * TILE;
        this.y = this.baseY;
    }

    update() {
        this.t++;
        if (this.t < 32) {
            this.y = this.baseY - Math.floor(this.t / 4);
        } else {
            this.y = this.baseY - 9 + Math.round(Math.sin(this.t * 0.07) * 1.5);
        }
    }

    hits(p) {
        return this.t > 16 && p.px < this.x + 8 && p.px + p.w > this.x && p.py < this.y + 8 && p.py + p.h > this.y;
    }

    render(gfx, camX, camY) {
        gfx.draw('petal', this.x - camX, this.y - camY);
    }
}

export class Prism {
    awake = false;
    t = 0;

    constructor(tx, ty, index) {
        this.index = index;
        this.cx = tx * TILE + 4;
        this.bottom = (ty + 1) * TILE;
    }

    /** Touching anywhere in its column counts, so it cannot be jumped over by accident. */
    hits(p) {
        return !this.awake && p.px + p.w > this.cx - 5 && p.px < this.cx + 5;
    }

    render(gfx, camX, camY, tick) {
        const name = this.awake ? 'prismAwake' : 'prismDormant';
        const x = this.cx - 6 - camX;
        const top = this.bottom - 18 - camY;
        const bob = this.awake ? Math.round(Math.sin(tick * 0.06) * 1.5) - 1 : 0;
        gfx.drawPart(name, 0, 0, 12, 12, x, top + bob);
        gfx.drawPart(name, 0, 13, 12, 5, x, top + 13);
        if (!this.awake && tick % 90 < 3) {
            gfx.pixel(x + 5, top + 3, C.WHITE);
        }
    }
}

export class GreatPrism {
    awake = false;

    constructor(tx, ty) {
        this.cx = tx * TILE + 4;
        this.bottom = (ty + 1) * TILE;
    }

    hits(p) {
        return !this.awake && p.px + p.w > this.cx - 6 && p.px < this.cx + 6;
    }

    render(gfx, camX, camY, tick) {
        const x = this.cx - 10 - camX;
        const top = this.bottom - 30 - camY;
        const bob = Math.round(Math.sin(tick * 0.05) * 2) - 2;
        gfx.drawPart('greatPrism', 0, 0, 20, 23, x, top + bob);
        gfx.drawPart('greatPrism', 0, 23, 20, 7, x, top + 23);
        // light rays around it
        if (!this.awake) {
            for (let i = 0; i < 6; i++) {
                const a = tick * 0.02 + i * 1.047;
                const r = 16 + Math.sin(tick * 0.1 + i) * 2;
                gfx.pixel(this.cx - camX + Math.cos(a) * r, top + 11 + bob + Math.sin(a) * r * 0.6, C.SPEC0 + i);
            }
        }
    }
}

export class Lantern {
    lit = false;

    constructor(tx, ty) {
        this.tx = tx;
        this.ty = ty;
        this.x = tx * TILE + 1;
        this.bottom = (ty + 1) * TILE;
    }

    /** Passing its column lights it, even mid-jump. */
    hits(p) {
        return p.px < this.x + 6 && p.px + p.w > this.x;
    }

    render(gfx, camX, camY) {
        gfx.draw(this.lit ? 'lanternOn' : 'lanternOff', this.x - camX, this.bottom - 14 - camY);
    }
}

export class Sign {
    constructor(tx, ty, index) {
        this.index = index;
        this.x = tx * TILE - 1;
        this.bottom = (ty + 1) * TILE;
        this.read = false;
    }

    near(p) {
        return p.px + p.w > this.x - 2 && p.px < this.x + 12 && p.bottom > this.bottom - 20 && p.py < this.bottom;
    }

    render(gfx, camX, camY, tick) {
        const x = this.x - camX;
        const y = this.bottom - 10 - camY;
        gfx.draw('sign', x, y);
        if (!this.read) {
            const bob = Math.floor(tick / 15) % 2;
            gfx.text('!', x + 4, y - 8 - bob, C.MOTE);
        }
    }
}

export class Bell {
    squash = 0;

    constructor(tx, ty) {
        this.x = tx * TILE;
        this.bottom = (ty + 1) * TILE;
    }

    get padTop() {
        return this.bottom - 6;
    }

    render(gfx, camX, camY, open) {
        const name = !open ? 'bellClosed' : this.squash > 0 ? 'bellSquash' : 'bellOpen';
        gfx.draw(name, this.x - camX, this.bottom - 10 - camY);
    }
}

export class Decor {
    constructor(ch, tx, ty) {
        this.ch = ch;
        this.tx = tx;
        this.x = tx * TILE;
        this.bottom = (ty + 1) * TILE;
        this.variant = (tx * 13 + ty * 7) % 3;
    }

    render(gfx, camX, camY, bloom, tick) {
        if (this.x < camX - 20 || this.x > camX + 200) {
            return;
        }
        if (this.ch === 'T') {
            gfx.draw(this.tree ?? 'tree', this.x - 4 - camX, this.bottom - 24 - camY);
        } else {
            const name = bloom ? `flower${this.variant}` : 'flowerBud';
            const sway = bloom && Math.floor((tick + this.tx * 11) / 40) % 2 ? 1 : 0;
            gfx.draw(name, this.x + sway - camX, this.bottom - 9 - camY);
        }
    }
}

// ---------------------------------------------------------------------------------------------- level 2 on

/**
 * Driftwood: a floating plank that bobs on the water and drifts slowly back and forth. Josepho can stand on
 * it (the game moves Josepho along with it). Position in whole pixels; `dx`/`dy` is the last frame's motion.
 */
export class Driftwood {
    w = 24;
    h = 4;

    constructor(tx, ty) {
        this.homeX = tx * TILE - 8;
        // put 'd' just above the water: the plank then sits half in it, its lower edge under the surface
        this.baseY = ty * TILE + 7;
        this.x = this.homeX;
        this.y = this.baseY;
        this.t = (tx * 17) % 200;
        this.range = 20; // pixels to each side
        this.dx = 0;
        this.dy = 0;
    }

    update(level) {
        this.t++;
        // floats while its water is there; when the water is drained it settles on the sea floor
        this.sunk ??= 0;
        const floating = level.isWater(this.homeX + 12, this.baseY + 6);
        if (floating) {
            this.sunk = Math.max(0, this.sunk - 1);
        } else if (!level.collides(this.x + 2, this.baseY + this.sunk + this.h, this.w - 4, 1, true)) {
            this.sunk = Math.min(this.sunk + 2, 64);
        }
        const drifting = floating ? Math.sin(this.t * 0.012) * this.range : this.x - this.homeX;
        const nx = Math.round(this.homeX + drifting);
        const ny = Math.round(this.baseY + this.sunk + (floating ? Math.sin(this.t * 0.06) * 1.2 : 0));
        this.dx = nx - this.x;
        this.dy = ny - this.y;
        this.x = nx;
        this.y = ny;
    }

    render(gfx, camX, camY) {
        gfx.draw('drift', this.x - camX, this.y - 1 - camY);
    }
}

// how the leaping fish behave
const FISH = {
    leapSpeed: 2.0, // up to about 2.5 tiles above the surface
    gravity: 0.1,
    drift: 0.4, // sideways speed during a leap
    waitMin: 180, // frames between leaps (3-5 seconds)
    waitMax: 300,
    near: 72, // only leaps when Josepho is this close (pixels, sideways)
};

/**
 * Leaping fish: waits under the surface, then leaps out in an arc and dives back. Stompable like a greyling.
 * It only leaps when Josepho is near, and always lands back in its own water. Where its water has been
 * drained (the color is off), it lies on the sea floor and only flops - harmless.
 */
export class Fish {
    alive = true;
    state = 'swim'; // swim | leap | squash | stranded
    w = 8;
    h = 6;
    stompable = true;
    active = true;
    timer = 0;

    constructor(tx, ty) {
        this.homeX = tx * TILE;
        this.homeY = ty * TILE + 2;
        this.x = this.homeX;
        this.y = this.homeY;
        this.vy = 0;
        this.dir = -1;
        this.wait = FISH.waitMin + ((tx * 37) % (FISH.waitMax - FISH.waitMin));
        this.minX = null; // the stretch of its water, found on the first update
        this.maxX = null;
    }

    /** The water the fish lives in, left to right on its row (whether or not its color is on right now). */
    findWater(level) {
        const ty = Math.floor((this.homeY + 3) / TILE);
        const isWaterTile = (tx) => level.legend[level.tile(tx, ty)]?.kind === 'water';
        let left = Math.floor((this.homeX + 4) / TILE);
        let right = left;
        while (isWaterTile(left - 1)) {
            left--;
        }
        while (isWaterTile(right + 1)) {
            right++;
        }
        this.minX = left * TILE + 1;
        this.maxX = (right + 1) * TILE - this.w - 1;
    }

    get px() {
        return Math.round(this.x);
    }

    get py() {
        return Math.round(this.y);
    }

    overlaps(p) {
        return p.px < this.px + this.w && p.px + p.w > this.px && p.py < this.py + this.h && p.py + p.h > this.py;
    }

    update(game) {
        const level = game.level;
        this.timer++;
        if (this.minX === null) {
            this.findWater(level);
        }
        if (this.state === 'squash') {
            this.y += 1;
            if (this.timer > 30) {
                this.alive = false;
            }
            return;
        }
        const watery = level.isWater(this.homeX + 4, this.homeY + 3);
        if (!watery) {
            // drained: drop to the floor and flop
            if (this.state !== 'stranded') {
                this.state = 'stranded';
                this.vy = 0;
            }
            if (!level.collides(this.px, this.py + this.h, this.w, 1, true)) {
                this.vy = Math.min(this.vy + 0.25, 3);
                this.y += this.vy;
            }
            return;
        }
        if (this.state === 'stranded') {
            // the water came back: swim up home
            this.y += (this.homeY - this.y) * 0.1;
            if (Math.abs(this.y - this.homeY) < 1) {
                this.state = 'swim';
                this.y = this.homeY;
            }
            return;
        }
        if (this.state === 'swim') {
            this.x = Math.max(this.minX, Math.min(this.maxX, this.homeX + Math.sin(this.timer * 0.03) * 6));
            const near = Math.abs(game.player.cx - (this.x + this.w / 2)) < FISH.near;
            if (this.timer > this.wait && near) {
                this.state = 'leap';
                this.vy = -FISH.leapSpeed;
                this.dir = game.player.cx < this.x ? -1 : 1;
                this.timer = 0;
            }
            return;
        }
        // leap: an arc that never leaves its own water
        this.vy += FISH.gravity;
        this.y += this.vy;
        this.x = Math.max(this.minX, Math.min(this.maxX, this.x + this.dir * FISH.drift));
        if (this.vy > 0 && this.y >= this.homeY) {
            this.y = this.homeY;
            this.homeX = this.x;
            this.state = 'swim';
            this.timer = 0;
            this.wait = FISH.waitMin + ((Math.round(this.homeX) * 7) % (FISH.waitMax - FISH.waitMin));
            game.fx.splash(this.x + 4, this.homeY);
        }
    }

    get harmless() {
        return this.state === 'stranded' || this.state === 'squash';
    }

    render(gfx, camX, camY) {
        const x = this.px - 1 - camX;
        const y = this.py - camY;
        if (this.state === 'stranded') {
            gfx.draw('fishFlop', x, y - 1 + (Math.floor(this.timer / 12) % 2));
            return;
        }
        let name = Math.floor(this.timer / 8) % 2 ? 'fish1' : 'fish0';
        if (this.dir > 0) {
            name += '<';
        }
        gfx.draw(name, x, y);
    }
}

/** A lost shade: one of three hidden in each level. */
export class Shade {
    taken = false;

    constructor(tx, ty, index) {
        this.index = index;
        this.x = tx * TILE;
        this.y = ty * TILE;
    }

    hits(p) {
        return p.px < this.x + 8 && p.px + p.w > this.x && p.py < this.y + 8 && p.py + p.h > this.y;
    }

    render(gfx, camX, camY, tick) {
        const bob = Math.round(Math.sin(tick * 0.07 + this.index) * 1.5);
        gfx.draw('shade', this.x - camX, this.y + bob - camY);
        if (tick % 40 < 3) {
            gfx.pixel(this.x + 3 - camX, this.y - 2 + bob - camY, C.WHITE);
        }
    }
}
