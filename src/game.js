// Josepho - Chapter 1: Svitani (Dawn).
//
// A platformer in the spirit of Mario and SuperTux, on a 192 x 108 pixel screen. Josepho is the last
// colorful being in a world that the Sorter split into black and white. Waking the prisms pours color
// back into the palette - and color changes the world: leaves, clouds and bell flowers only become
// solid once their color has returned.
//
// Files:
//   colors.js      palette slots and the chroma system (grey <-> color, dawn light)
//   art-data.js    all pixel art as editable text, packed into one sprite atlas
//   font.js        a 3 x 5 font with Czech diacritics
//   levels/        the levels (one file each), the world map data, and a README on the level format
//   map.js         the world map screen between levels
//   menu.js        the small menus on the title and pause screens
//   save.js        remembers finished levels in the browser
//   world.js       tiles, collisions, tile drawing
//   actors.js      Josepho, creatures, objects
//   background.js  parallax sky, sun and hills
//   fx.js          particles and rings
//   sound.js       synthesized sound effects and the layered music
//   gfx.js         drawing helpers
//   touch.js       on-screen controls for phones and tablets
//   fullscreen.js  fullscreen and landscape lock (browser API)
//   audio-unlock.js  starts the sound on phones (works around an engine limitation)

// Must come first: it has to be in place before the engine creates its audio (see the file).
import './audio-unlock.js';
import { bootstrap, BT, Color32, Vector2i } from 'blit386';
import {
    Bell,
    Decor,
    Driftwood,
    Fish,
    GreatPrism,
    Greyling,
    Lantern,
    Mote,
    Petal,
    PHYS,
    Player,
    PopMote,
    Prism,
    Shade,
    Sign,
    Thornback,
} from './actors.js';
import { Background } from './background.js';
import { C, computePalette, createChromaState, createPaletteSpec, PALETTE_SIZE } from './colors.js';
import { fullscreen } from './fullscreen.js';
import { Fx } from './fx.js';
import { gfx } from './gfx.js';
import { LEVELS, levelByNumber } from './levels/index.js';
import { WORLD } from './levels/worldmap.js';
import { WorldMap } from './map.js';
import { Menu } from './menu.js';
import { emptySave, hasProgress, loadSave, recordClear, writeSave } from './save.js';
import { Sound } from './sound.js';
import { TouchControls } from './touch.js';
import { Level, SUB, TILE } from './world.js';

const SCREEN_W = 192;
const SCREEN_H = 108;
const SAT_SPEED = 0.009; // a color fading in over about two seconds
const TIDE_SPEED = 0.15; // a tide switch recolors almost at once
// how far below the top of the screen the camera keeps Josepho: more room above in taller levels, for
// blocks and signs (a 14-row level like level 1 barely scrolls up and down at all)
const CAMERA_ABOVE = 50;
const CAMERA_ABOVE_TALL = 64;

// Keep in step with "version" in package.json and CHANGELOG.md.
export const VERSION = '0.2.0';

const STORY = [
    'KDYSI ZÁŘIL SVĚT LUMEN VŠEMI BARVAMI.',
    'PAK PŘIŠEL TŘÍDIČ. ROZDĚLIL SVĚTLO DO DVOU KRABIC - ČERNÉ A BÍLÉ. CO SE NEVEŠLO, ZMIZELO.',
    'JOSEPHO SE NEVEJDE DO ŽÁDNÉ KRABICE. A PROTO JOSEPHO NESE V SOBĚ VŠECHNY BARVY.',
    'ÚSVIT ZAČÍNÁ. PROBUĎ HRANOLY A VRAŤ SVĚTU SPEKTRUM.',
];


export class Game {
    configure() {
        return {
            displaySize: new Vector2i(SCREEN_W, SCREEN_H),
            targetFPS: 60,
            isCapturingKeyboardScroll: true,
            // touches belong to the game: no page scrolling or zooming under the fingers
            isCapturingPointerScroll: true,
            // keep the phone screen awake while playing
            isWakeLockEnabled: true,
            preferredOrientation: 'landscape',
            // let the canvas grow to fill big and fullscreen displays (the default stops at 960 x 720)
            maxCanvasSize: new Vector2i(3840, 2160),
            // no engine stats overlay: its toggle icon sat in the bottom-left corner, under the touch arrows
            // (set to true while measuring performance; the ` key then shows the stats)
            isOverlayEnabled: false,
        };
    }

    async init() {
        gfx.init();
        this.paletteBuf = new Uint8Array(PALETTE_SIZE * 3);
        this.lastBuf = new Uint8Array(PALETTE_SIZE * 3);
        this.scratch = new Color32(0, 0, 0, 255);
        this.palette = BT.paletteCreate(PALETTE_SIZE);
        this.save = loadSave();
        this.useSpec(createPaletteSpec());
        this.resetChroma();
        this.writePalette(this.palette, true);
        BT.paletteSet(this.palette);

        this.sound = new Sound();
        await this.sound.init();
        this.fx = new Fx();
        this.fx.reducedMotion = BT.isReducedMotionPreferred;

        this.touch = new TouchControls();
        fullscreen.install();

        this.tick = 0;
        this.prevKeys = {};
        this.openTitle();
        return true;
    }

    onReducedMotionChange(prefersReduced) {
        this.fx.reducedMotion = prefersReduced;
    }

    // ------------------------------------------------------------------ setup

    /** Switches to another palette arrangement (a level's, or the world map's). */
    useSpec(spec) {
        this.spec = spec;
        this.chroma = createChromaState(spec);
        this.satTarget = new Float32Array(spec.groupCount);
        // how fast each group's color fades in or out, per frame (tide switches are quick)
        this.satSpeed = new Float32Array(spec.groupCount).fill(SAT_SPEED);
        this.paletteDirty = true;
    }

    /** Index of a color group by name ('green', or a stripe id); -1 if this screen has no such group. */
    groupIndex(name) {
        return this.spec.groups[name] ?? -1;
    }

    /** Turns color groups on: their tiles get volume at once, their color fades in (instantly if asked). */
    turnOn(names, instant = false) {
        for (const name of names) {
            const g = this.groupIndex(name);
            if (g < 0) {
                continue;
            }
            this.satTarget[g] = 1;
            if (instant) {
                this.chroma.sat[g] = 1;
            }
            if (this.level) {
                this.level.gates[name] = true;
            }
        }
    }

    /** Turns color groups off: their tiles lose volume at once, their color fades to grey. */
    turnOff(names) {
        for (const name of names) {
            const g = this.groupIndex(name);
            if (g >= 0) {
                this.satTarget[g] = 0;
            }
            if (this.level) {
                this.level.gates[name] = false;
            }
        }
    }

    /** Every group grey except Josepho's own colors, plus whatever the level starts with. */
    resetChroma(startOn = []) {
        this.chroma.sat.fill(0);
        this.satTarget.fill(0);
        this.turnOn(['spirit', ...startOn], true);
        this.chroma.dawn = 0.06;
        this.chroma.flash = 0;
        this.chroma.drain = 0;
        this.chroma.fade = 0;
    }

    /** Builds a level from its definition in src/levels/ (the world, creatures, objects and palette). */
    loadLevel(number) {
        const def = levelByNumber(number) ?? LEVELS[0];
        this.def = def;
        this.levelNumber = def.number;
        this.level = null;
        this.useSpec(createPaletteSpec({ colors: def.theme?.colors, sky: def.theme?.sky, stripes: def.spectrum ?? [] }));
        this.level = new Level(def);
        this.background = new Background(this.level.pw, def.theme?.background);
        this.motes = [];
        this.prisms = [];
        this.lanterns = [];
        this.signs = [];
        this.bells = [];
        this.decor = [];
        this.drifts = [];
        this.shades = [];
        this.takenShades = new Set();
        this.greatPrism = null;
        let signIndex = 0;
        let start = { tx: 3, ty: 10 };
        for (const s of this.level.spawns) {
            switch (s.ch) {
                case '@':
                    start = s;
                    break;
                case 'o':
                    this.motes.push(Object.assign(new Mote(s.tx, s.ty), { id: this.motes.length }));
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    this.prisms.push(new Prism(s.tx, s.ty, Number(s.ch) - 1));
                    break;
                case 'F':
                    this.greatPrism = new GreatPrism(s.tx, s.ty);
                    break;
                case 'l':
                    this.lanterns.push(new Lantern(s.tx, s.ty));
                    break;
                case 's':
                    this.signs.push(new Sign(s.tx, s.ty, signIndex++));
                    break;
                case 'b':
                    this.bells.push(new Bell(s.tx, s.ty));
                    break;
                case 'f':
                case 'T': {
                    const d = new Decor(s.ch, s.tx, s.ty);
                    d.tree = def.theme?.tree;
                    this.decor.push(d);
                    break;
                }
                case 'd':
                    this.drifts.push(new Driftwood(s.tx, s.ty));
                    break;
                case 'z':
                    this.shades.push(new Shade(s.tx, s.ty, this.shades.length));
                    break;
            }
        }
        this.totalShades = this.shades.length;
        this.totalMotes = this.motes.length + this.level.tiles.flat().filter((ch) => ch === '?').length;
        this.startTile = start;
        this.checkpoint = start;
        this.player = new Player(start.tx * TILE + 1, (start.ty + 1) * TILE - 10);
        this.spawnEnemies();
        this.popMotes = [];
        this.petals = [];
        this.moteCount = 0;
        this.takenMotes = new Set();
        this.moteChain = 0;
        this.moteChainTimer = 0;
        this.maxX = 0;
        this.freeze = 0;
        this.banner = null;
        this.activeSign = null;
        this.typed = 0;
        this.paused = false;
        this.finaleTime = -1;
        this.frames = 0;
        this.deaths = 0;
        this.sound.layers = 1;
        this.sound.musicOn = true;
        this.camX = 0;
        this.camY = 4;
        this.snapCamera();
    }

    spawnEnemies() {
        this.enemies = [];
        for (const s of this.level.spawns) {
            if (s.ch === 'e') {
                this.enemies.push(new Greyling(s.tx, s.ty));
            } else if (s.ch === 't') {
                this.enemies.push(new Thornback(s.tx, s.ty));
            } else if (s.ch === 'r') {
                this.enemies.push(new Fish(s.tx, s.ty));
            }
        }
    }

    // ------------------------------------------------------------------ input

    readInput() {
        const t = this.touch;
        t.update();
        const k = (...codes) => codes.some((c) => BT.isKeyDown(c));
        const b = (btn) => BT.isDown(btn, 0);
        const now = {
            left: k('ArrowLeft', 'KeyA') || b(BT.BTN_LEFT) || t.left,
            right: k('ArrowRight', 'KeyD') || b(BT.BTN_RIGHT) || t.right,
            down: k('ArrowDown', 'KeyS') || b(BT.BTN_DOWN),
            jump: k('Space', 'KeyZ', 'KeyK', 'ArrowUp', 'KeyW') || b(BT.BTN_A) || b(BT.BTN_UP) || t.jump,
            run: k('ShiftLeft', 'ShiftRight', 'KeyX', 'KeyJ', 'ControlLeft', 'ControlRight') || b(BT.BTN_B) || b(BT.BTN_X) || t.run,
            start: k('Enter', 'Escape', 'KeyP') || b(BT.BTN_START),
        };
        // menu input: its own keys, because Up is also a jump key during play
        const ui = {
            up: k('ArrowUp', 'KeyW') || b(BT.BTN_UP),
            down: k('ArrowDown', 'KeyS') || b(BT.BTN_DOWN),
            left: k('ArrowLeft', 'KeyA') || b(BT.BTN_LEFT),
            right: k('ArrowRight', 'KeyD') || b(BT.BTN_RIGHT),
            confirm: k('Space', 'Enter', 'KeyZ', 'KeyK') || b(BT.BTN_A),
            back: k('Escape') || b(BT.BTN_B),
        };
        const prevUi = this.prevUi ?? {};
        this.ui = {
            upPressed: ui.up && !prevUi.up,
            downPressed: ui.down && !prevUi.down,
            leftPressed: ui.left && !prevUi.left,
            rightPressed: ui.right && !prevUi.right,
            confirmPressed: ui.confirm && !prevUi.confirm,
            backPressed: ui.back && !prevUi.back,
        };
        this.prevUi = ui;
        const inp = {
            ...now,
            jumpPressed: now.jump && !this.prevKeys.jump,
            startPressed: (now.start && !this.prevKeys.start) || (t.pausePressed && this.state === 'play'),
            // any new touch or click this frame (menus use it as "confirm")
            tap: t.taps.length > 0,
        };
        this.prevKeys = now;
        return inp;
    }

    /** Phone held upright: the 16:9 screen would be tiny, so the game waits. */
    isPortrait() {
        return this.touch.active && typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
    }

    /** The fullscreen button's tap area on the title screen. */
    fullscreenButton() {
        return { x: 172, y: 0, w: 20, h: 14 };
    }

    /** Handles a tap on the fullscreen button; returns true if the tap was used. */
    handleFullscreenTap() {
        if (!fullscreen.isSupported) {
            return false;
        }
        const r = this.fullscreenButton();
        if (this.touch.tappedIn(r.x, r.y, r.w, r.h)) {
            fullscreen.request();
            return true;
        }
        return false;
    }

    // ------------------------------------------------------------------ update

    update() {
        this.tick++;
        this.stateTime++;
        this.chroma.tick = this.tick;
        this.chroma.lantern = this.tick;
        const inp = this.readInput();

        switch (this.state) {
            case 'title':
                this.updateTitle(inp);
                break;
            case 'story':
                this.updateStory(inp);
                break;
            case 'map':
                this.updateMap(inp);
                break;
            case 'play':
                this.updatePlay(inp);
                break;
            case 'clear':
                this.updateClear(inp);
                break;
        }
        this.sound.update();
        this.updateChroma();
        const pal = BT.isSplashVisible ? null : BT.palette;
        if (pal) {
            this.writePalette(pal, false);
        }
    }

    setState(state) {
        this.state = state;
        this.stateTime = 0;
    }

    updateTitle(inp) {
        this.camX = 0;
        this.camY = 4;
        this.chroma.dawn = 0.06 + Math.sin(this.tick * 0.004) * 0.02;
        this.fx.update();
        if (this.tick % 50 === 0) {
            this.fx.add({ kind: 'spark', x: 60 + Math.random() * 80, y: 60 + Math.random() * 20, vx: 0, vy: -0.2, life: 60, hue: this.tick % 6 });
        }
        if (inp.tap && this.handleFullscreenTap()) {
            return;
        }
        if (this.stateTime <= 20) {
            return;
        }
        let choice = null;
        if (this.titleMenu) {
            choice = this.titleMenu.update(this.ui, this.touch);
        } else if (inp.jumpPressed || inp.startPressed || inp.tap) {
            choice = 'new';
        }
        if (!choice) {
            return;
        }
        if (inp.tap && this.touch.active) {
            // on phones, starting the game also goes fullscreen
            fullscreen.requestEnter();
        }
        if (choice === 'continue') {
            this.sound.play('lantern');
            const p = this.save.inProgress;
            if (p && !p.left && levelByNumber(p.level)) {
                // straight back into the level that was being played, at its last lantern
                this.startLevel(p.level, true);
            } else {
                this.openMap();
            }
        } else if (choice === 'new') {
            if (hasProgress(this.save) && !this.confirmNew) {
                // one more press to confirm wiping the progress
                this.confirmNew = true;
                this.titleMenu.items[1].label = 'OPRAVDU? SMAŽE POSTUP';
                this.sound.play('text');
                return;
            }
            this.save = emptySave();
            writeSave(this.save);
            this.sound.play('lantern');
            this.storyPage = 0;
            this.typed = 0;
            this.setState('story');
        }
    }

    openTitle() {
        this.loadLevel(1);
        this.resetChroma();
        this.fx.clear();
        this.confirmNew = false;
        this.titleMenu = hasProgress(this.save)
            ? new Menu([
                  { label: 'POKRAČOVAT', id: 'continue' },
                  { label: 'NOVÁ HRA', id: 'new' },
              ])
            : null;
        this.setState('title');
    }

    /** The world map. After a finished level, Josepho walks on to the next node by itself. */
    openMap(justCompleted = null) {
        this.level = null;
        this.useSpec(createPaletteSpec({ flags: WORLD.nodes.map((n) => n.flag) }));
        this.chroma.dawn = 1;
        const doneCount = Object.keys(this.save.done).length;
        const on = ['spirit'];
        if (doneCount > 0) {
            // the first finished level brings the land back
            on.push('sky', 'earth', 'green', 'bloom');
        }
        for (const node of WORLD.nodes) {
            if (this.save.done[node.number] && node.number !== justCompleted) {
                on.push(`flag${node.number}`);
            }
        }
        this.turnOn(on, true);
        if (justCompleted !== null) {
            // the flag of the level just finished colors in slowly
            this.turnOn([`flag${justCompleted}`]);
            if (justCompleted === 1) {
                for (const g of ['sky', 'earth', 'green', 'bloom']) {
                    this.chroma.sat[this.groupIndex(g)] = 0;
                }
            }
        }
        this.map = new WorldMap(WORLD, this.save, (n) => !!levelByNumber(n));
        if (justCompleted !== null && justCompleted < this.save.unlocked) {
            this.map.walkTo(justCompleted);
        }
        this.sound.layers = Math.min(4, 1 + doneCount);
        this.sound.musicOn = true;
        this.fx.clear();
        this.chroma.fade = 1;
        this.fadeIn = true;
        this.setState('map');
    }

    updateMap(inp) {
        if (this.fadeIn) {
            this.chroma.fade = Math.max(0, this.chroma.fade - 0.05);
            this.fadeIn = this.chroma.fade > 0;
        }
        const res = this.map.update(inp, this.ui, this.touch);
        const current = this.map.at + 1;
        if (current !== this.save.current && !this.map.moving) {
            this.save.current = current;
            writeSave(this.save);
        }
        if (res?.play) {
            this.sound.play('lantern');
            // a level left half-way continues from its last lantern
            this.startLevel(res.play, true);
        } else if (res?.back) {
            this.openTitle();
        }
    }

    /**
     * Starts a level. With resume, and a saved game for this level, it continues from the last lantern with
     * the prisms, motes and blocks as they were; otherwise it starts from the beginning.
     */
    startLevel(number, resume = false) {
        this.loadLevel(number);
        this.resetChroma(this.def.startOn ?? []);
        const saved = this.save.inProgress;
        if (resume && saved?.level === this.levelNumber) {
            this.restoreProgress(saved);
        }
        this.fx.clear();
        this.chroma.fade = 1;
        this.fadeIn = true;
        this.banner = { text: `${this.def.number}  ${this.def.name}`, t: 0 };
        this.setState('play');
        this.saveProgress();
    }

    /** Remembers where Josepho is in the level (the last lantern) and what has changed since the start. */
    saveProgress() {
        this.save.inProgress = {
            level: this.levelNumber,
            checkpoint: this.checkpoint,
            prisms: this.prisms.filter((p) => p.awake).map((p) => p.index),
            motes: [...this.takenMotes],
            shades: [...this.takenShades],
            tiles: [...this.level.changes],
            moteCount: this.moteCount,
            frames: this.frames,
            maxX: this.maxX,
            tide: this.level.activeSwitch(),
        };
        writeSave(this.save);
    }

    restoreProgress(p) {
        for (const index of p.prisms ?? []) {
            const prism = this.prisms.find((pr) => pr.index === index);
            if (prism) {
                prism.awake = true;
                this.turnOn(this.def.prisms?.[index]?.turnsOn ?? [], true);
                this.sound.layers = Math.min(4, this.sound.layers + 1);
            }
        }
        this.takenMotes = new Set(p.motes ?? []);
        this.motes = this.motes.filter((m) => !this.takenMotes.has(m.id));
        this.takenShades = new Set(p.shades ?? []);
        this.shades = this.shades.filter((s) => !this.takenShades.has(s.index));
        for (const [key, ch] of p.tiles ?? []) {
            const [tx, ty] = key.split(',').map(Number);
            this.level.set(tx, ty, ch);
            this.level.changes.set(key, ch);
        }
        if (p.tide && this.level.switches.includes(p.tide)) {
            // the tide as it was at the lantern
            this.turnOff(this.level.switches.filter((g) => g !== p.tide));
            this.turnOn([p.tide], true);
            for (const g of this.level.switches) {
                if (g !== p.tide) {
                    this.chroma.sat[this.groupIndex(g)] = 0;
                }
            }
        }
        this.moteCount = p.moteCount ?? 0;
        this.frames = p.frames ?? 0;
        this.maxX = p.maxX ?? 0;
        if (p.checkpoint) {
            this.checkpoint = p.checkpoint;
            for (const l of this.lanterns) {
                l.lit = l.tx <= p.checkpoint.tx;
            }
            this.player.reset(p.checkpoint.tx * TILE + 1, (p.checkpoint.ty + 1) * TILE - 10);
        }
        // the sunrise is as far along as Josepho got
        const progress = this.maxX / Math.max(1, this.level.pw - SCREEN_W);
        this.chroma.dawn = 0.06 + Math.min(1, progress) * 0.9;
        this.snapCamera();
    }

    /** Remembers the finished level and unlocks the next one. */
    completeLevel() {
        const result = {
            motes: this.moteCount,
            total: this.totalMotes,
            frames: this.frames,
            shades: this.takenShades.size,
            totalShades: this.totalShades,
        };
        recordClear(this.save, this.levelNumber, result, WORLD.nodes.length);
        writeSave(this.save);
    }

    updateStory(inp) {
        const page = STORY[this.storyPage];
        if (this.typed < page.length) {
            this.typed++;
            if (this.typed % 2 === 0 && page[this.typed - 1] !== ' ') {
                this.sound.play('text');
            }
        }
        if (inp.startPressed) {
            this.openMap();
            return;
        }
        if (inp.jumpPressed || inp.tap) {
            if (this.typed < page.length) {
                this.typed = page.length;
            } else if (this.storyPage < STORY.length - 1) {
                this.storyPage++;
                this.typed = 0;
            } else {
                this.openMap();
            }
        }
    }

    updatePlay(inp) {
        if (this.fadeIn) {
            this.chroma.fade = Math.max(0, this.chroma.fade - 0.05);
            if (this.chroma.fade === 0) {
                this.fadeIn = false;
            }
        }
        if (this.isPortrait() && this.finaleTime < 0) {
            if (!this.paused) {
                this.setPaused(true);
            }
            return;
        }
        if (inp.startPressed && this.finaleTime < 0 && !this.player.dead) {
            this.setPaused(!this.paused);
            return;
        }
        if (this.paused) {
            const choice = this.pauseMenu.update(this.ui, this.touch);
            if (choice === 'resume') {
                this.setPaused(false);
            } else if (choice === 'map') {
                if (this.save.inProgress?.level === this.levelNumber) {
                    // left on purpose: "Continue" on the title then opens the map, the map resumes the level
                    this.save.inProgress.left = true;
                    writeSave(this.save);
                }
                this.openMap();
            } else if (choice === 'restart') {
                this.startLevel(this.levelNumber);
            } else if (choice === 'fullscreen') {
                fullscreen.request();
            }
            return;
        }
        this.frames++;
        this.fx.update();
        this.level.update();
        if (this.banner) {
            this.banner.t++;
            if (this.banner.t > 200) {
                this.banner = null;
            }
        }
        if (this.freeze > 0) {
            this.freeze--;
            if (this.freeze === 0 && this.pendingSat) {
                this.turnOn(this.pendingSat);
                this.pendingSat = null;
            }
            return;
        }

        const p = this.player;
        this.carryOnDrift(p);
        p.update(inp, this);
        this.landOnDrift(p);

        if (p.dead) {
            this.updateDeath();
            this.updateCamera();
            return;
        }

        this.updateEnemies(inp);
        this.updateObjects(inp);
        this.updateCamera();

        this.maxX = Math.max(this.maxX, p.px);
        if (this.finaleTime >= 0) {
            this.updateFinale();
        }
    }

    setPaused(paused) {
        this.paused = paused;
        this.sound.play('text');
        if (paused) {
            const items = [
                { label: 'POKRAČOVAT', id: 'resume' },
                { label: 'ZNOVU OD ZAČÁTKU', id: 'restart' },
                { label: 'ZPĚT NA MAPU', id: 'map' },
            ];
            if (fullscreen.isSupported) {
                items.push({ label: fullscreen.isOn ? 'ZRUŠIT CELOU OBRAZOVKU' : 'CELÁ OBRAZOVKA', id: 'fullscreen' });
            }
            this.pauseMenu = new Menu(items);
        }
    }

    updateEnemies(inp) {
        const p = this.player;
        for (const e of this.enemies) {
            e.update(this);
            const dangerous = e instanceof Fish ? !e.harmless : e.state === 'walk';
            if (!e.active || !dangerous) {
                continue;
            }
            // creatures bounce off each other
            for (const o of this.enemies) {
                if (e.state !== 'walk') {
                    break;
                }
                if (o !== e && o.state === 'walk' && o.active && e.overlaps(o) && Math.sign(o.px - e.px) === Math.sign(e.vx)) {
                    e.vx = -e.vx;
                }
            }
            if (!e.overlaps(p) || p.dead) {
                continue;
            }
            const stomp = e.stompable && p.vy > 0 && p.prevBottom <= e.py + 3;
            if (stomp) {
                e.state = 'squash';
                e.timer = 0;
                p.vy = -(inp.jump ? PHYS.stompBounce + 14 : PHYS.stompBounce);
                p.jumping = inp.jump;
                p.flutterFuel = PHYS.flutterMax;
                this.sound.play('stomp');
                // the color it drank flies free
                this.fx.sparks(e.px + 4, e.py + 3, 10, 1.2);
                this.fx.kick(1);
            } else {
                p.hurt(this);
            }
        }
        this.enemies = this.enemies.filter((e) => e.alive);
    }

    updateObjects(inp) {
        const p = this.player;
        const level = this.level;

        // motes; quick chains climb the scale
        if (this.moteChainTimer > 0) {
            this.moteChainTimer--;
        } else {
            this.moteChain = 0;
        }
        for (const m of this.motes) {
            if (!m.taken && m.hits(p)) {
                m.taken = true;
                this.takenMotes.add(m.id);
                this.collectMote(m.x + 3, m.y + 3);
            }
        }
        this.motes = this.motes.filter((m) => !m.taken);

        for (const sh of this.shades) {
            if (!sh.taken && sh.hits(p)) {
                sh.taken = true;
                this.takenShades.add(sh.index);
                this.sound.play('power');
                this.sound.arpeggio([74, 78, 81, 86], 4, 'bell', 1);
                this.fx.sparks(sh.x + 3, sh.y + 3, 30, 1.8);
                this.banner = { text: `ZTRACENÝ ODSTÍN ${this.takenShades.size}/${this.totalShades}`, t: 0 };
            }
        }
        this.shades = this.shades.filter((sh) => !sh.taken);

        for (const m of this.popMotes) {
            m.update();
        }
        this.popMotes = this.popMotes.filter((m) => m.alive);

        for (const pe of this.petals) {
            pe.update();
            if (pe.hits(p)) {
                pe.alive = false;
                p.glow = true;
                this.sound.play('power');
                this.fx.sparks(p.cx, p.py + 5, 24, 1.8);
                this.fx.ring(p.cx, p.py + 5, 2, C.MOTE_HI, 24);
            }
        }
        this.petals = this.petals.filter((pe) => pe.alive);

        for (const pr of this.prisms) {
            if (pr.hits(p)) {
                this.wakePrism(pr);
            }
        }
        if (this.greatPrism?.hits(p)) {
            this.startFinale();
        }

        for (const l of this.lanterns) {
            if (!l.lit && l.hits(p)) {
                l.lit = true;
                this.checkpoint = { tx: l.tx, ty: l.ty };
                this.saveProgress();
                this.sound.play('lantern');
                this.fx.burst(l.x + 3, l.bottom - 11, 16, [C.LANTERN, C.MOTE_HI, C.MOTE], 1);
            }
        }

        // bell flowers throw Josepho high once the flowers are back
        for (const b of this.bells) {
            if (b.squash > 0) {
                b.squash--;
            }
            if (!level.gates.bloom) {
                continue;
            }
            const overX = p.px + p.w > b.x + 2 && p.px < b.x + 14;
            if (overX && p.vy > 0 && p.prevBottom <= b.padTop && p.bottom >= b.padTop) {
                p.y = (b.padTop - p.h) * SUB;
                p.vy = -PHYS.springPower;
                p.spring = true;
                p.jumping = false;
                p.flutterFuel = PHYS.flutterMax;
                b.squash = 10;
                this.sound.play('spring');
                this.fx.burst(b.x + 8, b.padTop, 12, [C.PETAL_A, C.CORE], 1.2);
            }
        }

        // signs: the nearest one opens its text box
        const near = this.signs.find((s) => s.near(p)) ?? null;
        if (near !== this.activeSign) {
            this.activeSign = near;
            this.typed = 0;
        }
        if (near) {
            near.read = true;
            const text = this.signText(near.index);
            if (this.typed < text.length) {
                this.typed++;
                if (this.typed % 3 === 0) {
                    this.sound.play('text');
                }
            }
        }
    }

    collectMote(x, y) {
        this.moteCount++;
        this.moteChain = Math.min(12, this.moteChain + 1);
        this.moteChainTimer = 40;
        this.sound.play('mote', { pitch: 2 ** ((this.moteChain - 1) / 12) });
        this.fx.burst(x, y, 6, [C.MOTE, C.MOTE_HI], 0.8, 0.02, 14);
    }

    /**
     * A tide switch was bumped: the color that is on goes grey (and loses its volume), the other one comes on.
     * If Josepho would now be stuck inside a tile that just got volume, they are nudged out.
     */
    flipTide(tx, ty) {
        const level = this.level;
        const [a, b] = level.switches;
        const now = level.activeSwitch();
        const next = now === a ? b : a;
        for (const name of [a, b]) {
            const g = this.groupIndex(name);
            if (g >= 0) {
                this.satSpeed[g] = TIDE_SPEED;
            }
        }
        this.turnOff([now]);
        this.turnOn([next]);
        this.sound.play('spring', { pitch: next === a ? 1.3 : 0.8 });
        this.fx.ring(tx * TILE + 4, ty * TILE + 4, 3, C.WATER_FOAM, 30);
        this.unstick(this.player);
    }

    /** Moves Josepho out of solid tiles (up first, then down, then sideways), up to one tile. */
    unstick(p) {
        const level = this.level;
        if (!level.collides(p.px, p.py, p.w, p.h)) {
            return;
        }
        for (let d = 1; d <= TILE; d++) {
            for (const [dx, dy] of [
                [0, -d],
                [0, d],
                [-d, 0],
                [d, 0],
            ]) {
                if (!level.collides(p.px + dx, p.py + dy, p.w, p.h)) {
                    p.x += dx * SUB;
                    p.y += dy * SUB;
                    if (dy < 0) {
                        p.vy = 0;
                    }
                    return;
                }
            }
        }
    }

    /** Driftwood moves first and carries Josepho if they stand on it. */
    carryOnDrift(p) {
        for (const d of this.drifts) {
            d.update(this.level);
        }
        const d = p.platform;
        if (!d || p.dead) {
            return;
        }
        if (!this.level.collides(p.px + d.dx, p.py + d.dy, p.w, p.h)) {
            p.x += d.dx * SUB;
            p.y += d.dy * SUB;
        }
    }

    /** After Josepho moved: did they land on (or stay on) a piece of driftwood? */
    landOnDrift(p) {
        p.platform = null;
        if (p.dead || p.vy < 0) {
            return;
        }
        for (const d of this.drifts) {
            const overX = p.px + p.w > d.x + 1 && p.px < d.x + d.w - 1;
            if (overX && p.prevBottom <= d.y + 2 && p.bottom >= d.y) {
                p.y = (d.y - p.h) * SUB;
                p.vy = 0;
                p.onGround = true;
                p.platform = d;
                p.flutterFuel = PHYS.flutterMax;
                p.fluttering = false;
                return;
            }
        }
    }

    /** Josepho's head hit a tile. */
    headBump(p) {
        const level = this.level;
        const ty = Math.floor((p.py - 1) / TILE);
        const cols = [Math.floor(p.cx / TILE), Math.floor(p.px / TILE), Math.floor((p.px + p.w - 1) / TILE)];
        let tx = cols[0];
        for (const c of cols) {
            if (level.isSolidTile(level.tile(c, ty))) {
                tx = c;
                break;
            }
        }
        const result = level.bump(tx, ty, p.glow);
        if (!result) {
            return;
        }
        if (result === 'mote') {
            this.popMotes.push(new PopMote(tx * TILE + 1, ty * TILE - 6));
            this.collectMote(tx * TILE + 4, ty * TILE - 2);
        } else if (result === 'petal') {
            if (p.glow) {
                this.popMotes.push(new PopMote(tx * TILE + 1, ty * TILE - 6));
                this.collectMote(tx * TILE + 4, ty * TILE - 2);
            } else {
                this.petals.push(new Petal(tx, ty));
                this.sound.play('bump');
                this.sound.arpeggio([72, 76, 79, 84], 5);
            }
        } else if (result === 'switch') {
            this.flipTide(tx, ty);
        } else if (result === 'break') {
            this.fx.chips(tx * TILE + 2, ty * TILE + 2);
            this.sound.play('break');
        } else {
            this.sound.play('bump', { volume: result === 'thud' ? 0.5 : 1 });
        }
        if (result !== 'thud') {
            // anything standing on the tile gets knocked off
            for (const e of this.enemies) {
                if (e.state === 'walk' && e.active && e.py + e.h === ty * TILE && e.px + e.w > tx * TILE && e.px < tx * TILE + TILE) {
                    e.flip(this, Math.sign(e.px - tx * TILE - 2) || 1);
                    this.sound.play('stomp');
                }
            }
        }
    }

    wakePrism(pr) {
        pr.awake = true;
        const info = this.def.prisms?.[pr.index] ?? { turnsOn: [], banner: '' };
        // volume comes at once, the color after the short freeze
        for (const name of info.turnsOn) {
            this.level.gates[name] = true;
        }
        this.pendingSat = info.turnsOn;
        this.freeze = 36;
        if (!this.fx.reducedMotion) {
            this.chroma.flash = 0.85;
        }
        const cy = pr.bottom - 12;
        this.fx.ring(pr.cx, cy, 3.2, C.WHITE, 90, 2);
        this.fx.ring(pr.cx, cy, 2.4, C.MOTE_HI, 90);
        this.fx.ring(pr.cx, cy, 1.6, C.SPEC0 + 2, 90);
        this.fx.sparks(pr.cx, cy, 48, 2.2);
        this.fx.kick(3);
        this.sound.play('prism');
        this.sound.arpeggio([62, 66, 69, 74, 78, 81, 86], 4, 'bell', 1);
        this.sound.layers = Math.min(4, this.sound.layers + 1);
        if (info.banner) {
            this.banner = { text: info.banner, t: 0 };
        }
    }

    startFinale() {
        this.greatPrism.awake = true;
        this.player.happy = true;
        this.player.vx = 0;
        this.finaleTime = 0;
        this.freeze = 40;
        // the end of every level: the whole palette on
        this.turnOn(Object.keys(this.spec.groups));
        if (!this.fx.reducedMotion) {
            this.chroma.flash = 1;
        }
        const cy = this.greatPrism.bottom - 18;
        for (let i = 0; i < 4; i++) {
            this.fx.ring(this.greatPrism.cx, cy, 1.5 + i * 0.9, C.SPEC0 + i, 120, 1);
        }
        this.fx.sparks(this.greatPrism.cx, cy, 70, 2.6);
        this.fx.kick(4);
        this.sound.play('prism');
        this.sound.arpeggio([62, 66, 69, 74, 78, 81, 86, 90], 5, 'bell', 1);
        this.sound.layers = 4;
        this.banner = { text: 'SPEKTRUM JE ZPĚT', t: 0 };
    }

    updateFinale() {
        this.finaleTime++;
        const t = this.finaleTime;
        if (t % 24 === 0 && t < 200) {
            const x = this.camX + 30 + Math.random() * 130;
            const y = this.camY + 10 + Math.random() * 40;
            this.fx.sparks(x, y, 24, 1.4);
            this.sound.note('bell', 74 + (t / 24) * 2, 880, 0.7);
        }
        if (t > 260) {
            this.chroma.fade = Math.min(1, this.chroma.fade + 0.03);
            if (this.chroma.fade >= 1) {
                this.completeLevel();
                this.setState('clear');
                this.chroma.fade = 0;
            }
        }
    }

    killPlayer(cause) {
        const p = this.player;
        if (p.dead || p.happy) {
            return;
        }
        p.dead = true;
        p.deadTimer = 0;
        p.deathCause = cause;
        p.glow = false;
        p.vy = cause === 'water' || cause === 'pit' ? 0 : -44;
        this.deaths++;
        this.sound.play('death');
        this.sound.musicOn = false;
        if (cause === 'water') {
            this.sound.play('splash');
            this.fx.splash(p.cx, p.py + p.h - 2);
        } else {
            this.fx.burst(p.cx, p.py + 5, 12, [C.J_BODY, C.J_LIGHT, C.SPEC0], 1.2);
        }
        this.fx.kick(2);
    }

    updateDeath() {
        const p = this.player;
        this.chroma.drain = Math.min(0.85, this.chroma.drain + 0.03);
        const wait = p.deathCause === 'hit' || p.deathCause === 'thorns' ? 90 : 55;
        if (p.deadTimer > wait) {
            this.chroma.fade = Math.min(1, this.chroma.fade + 0.06);
            if (this.chroma.fade >= 1) {
                this.respawn();
            }
        }
    }

    respawn() {
        const cp = this.checkpoint;
        this.player.reset(cp.tx * TILE + 1, (cp.ty + 1) * TILE - 10);
        this.spawnEnemies();
        this.petals = [];
        this.popMotes = [];
        this.fx.clear();
        this.chroma.drain = 0;
        this.fadeIn = true;
        this.sound.musicOn = true;
        this.snapCamera();
    }

    updateCamera() {
        const p = this.player;
        const level = this.level;
        this.look = (this.look ?? 0) + (p.facing * 18 - (this.look ?? 0)) * 0.03;
        const tx = p.cx - SCREEN_W / 2 + this.look;
        this.camX += (tx - this.camX) * 0.14;
        this.camX = Math.max(0, Math.min(level.pw - SCREEN_W, this.camX));
        const ty = Math.max(0, Math.min(level.ph - SCREEN_H, p.py - this.cameraAbove()));
        this.camY += (ty - this.camY) * 0.1;
    }

    cameraAbove() {
        return this.level.h > 14 ? CAMERA_ABOVE_TALL : CAMERA_ABOVE;
    }

    snapCamera() {
        const p = this.player;
        this.look = p.facing * 18;
        this.camX = Math.max(0, Math.min(this.level.pw - SCREEN_W, p.cx - SCREEN_W / 2 + this.look));
        this.camY = Math.max(0, Math.min(this.level.ph - SCREEN_H, p.py - this.cameraAbove()));
    }

    updateClear(inp) {
        this.fx.update();
        if (this.stateTime % 30 === 0) {
            this.fx.sparks(20 + Math.random() * 150, 20 + Math.random() * 30, 16, 1.2);
        }
        if (this.stateTime > 60 && (inp.jumpPressed || inp.startPressed || inp.tap)) {
            this.openMap(this.levelNumber);
        }
    }

    // ------------------------------------------------------------------ palette

    updateChroma() {
        const ch = this.chroma;
        for (let g = 0; g < ch.sat.length; g++) {
            const d = this.satTarget[g] - ch.sat[g];
            ch.sat[g] += Math.sign(d) * Math.min(Math.abs(d), this.satSpeed[g]);
        }
        ch.flash = Math.max(0, ch.flash - 0.03);
        if (this.state === 'play') {
            const progress = this.maxX / Math.max(1, this.level.pw - SCREEN_W);
            const target = this.finaleTime >= 0 ? 1 : 0.06 + Math.min(1, progress) * 0.9;
            ch.dawn += (target - ch.dawn) * 0.01;
        } else if (this.state === 'clear') {
            ch.dawn += (1 - ch.dawn) * 0.02;
        }
    }

    writePalette(pal, force) {
        if (this.paletteDirty) {
            force = true;
            this.paletteDirty = false;
        }
        computePalette(this.chroma, this.paletteBuf, this.spec);
        const buf = this.paletteBuf;
        for (let slot = 1; slot < PALETTE_SIZE; slot++) {
            const o = slot * 3;
            if (!force && buf[o] === this.lastBuf[o] && buf[o + 1] === this.lastBuf[o + 1] && buf[o + 2] === this.lastBuf[o + 2]) {
                continue;
            }
            this.scratch.setRGBA(buf[o], buf[o + 1], buf[o + 2], 255);
            pal.set(slot, this.scratch);
        }
        this.lastBuf.set(buf);
    }

    // ------------------------------------------------------------------ render

    render() {
        // BLIT386 starts every frame with the camera last passed to cameraSet() - cameraReset() does not clear
        // that - so each frame begins from a clean camera. Without this the world map inherited the level's
        // camera and was drawn shifted (or entirely off screen after finishing a level).
        BT.cameraReset();
        switch (this.state) {
            case 'title':
                this.renderWorld(false);
                this.renderTitle();
                break;
            case 'story':
                this.renderWorld(false);
                this.renderStory();
                break;
            case 'map':
                this.map.render(gfx, this.touch.active);
                break;
            case 'play':
                this.renderWorld(true);
                this.renderHud();
                break;
            case 'clear':
                this.renderWorld(false);
                this.renderClear();
                break;
        }
        if (this.isPortrait()) {
            this.renderRotateHint();
        }
    }

    renderRotateHint() {
        gfx.rect(0, 0, SCREEN_W, SCREEN_H, C.INK);
        // a little phone turning on its side
        const t = Math.floor(this.tick / 40) % 2;
        if (t) {
            gfx.frame(84, 34, 24, 14, C.WHITE);
            gfx.rect(104, 39, 2, 4, C.WHITE);
        } else {
            gfx.frame(89, 28, 14, 24, C.WHITE);
            gfx.rect(94, 48, 4, 2, C.WHITE);
        }
        gfx.textCentered('OTOČ ZAŘÍZENÍ NA ŠÍŘKU', SCREEN_W / 2, 66, C.WHITE);
    }

    /** The sign text, with a touch version where the keyboard one would not make sense. */
    signText(index) {
        if (this.touch.active && this.def.touchSigns?.[index]) {
            return this.def.touchSigns[index];
        }
        return this.def.signs?.[index] ?? '';
    }

    renderWorld(withActors) {
        BT.cameraReset();
        BT.clear(C.SKY0);
        const shake = this.fx.shake > 0 ? Math.round((Math.random() - 0.5) * this.fx.shake * 2) : 0;
        const cx = Math.round(this.camX) + shake;
        const cy = Math.round(this.camY);
        this.background.render(gfx, cx, this.chroma.dawn, this.tick);

        const bloom = this.level.gates.bloom;
        for (const d of this.decor) {
            if (d.ch === 'T') {
                d.render(gfx, cx, cy, bloom, this.tick);
            }
        }
        for (const pe of this.petals) {
            pe.render(gfx, cx, cy);
        }

        BT.cameraSet(new Vector2i(cx, cy));
        this.level.render(gfx, cx, cy);
        BT.cameraReset();
        for (const d of this.drifts) {
            d.render(gfx, cx, cy);
        }

        for (const d of this.decor) {
            if (d.ch === 'f') {
                d.render(gfx, cx, cy, bloom, this.tick);
            }
        }
        for (const s of this.signs) {
            s.render(gfx, cx, cy, this.tick);
        }
        for (const l of this.lanterns) {
            l.render(gfx, cx, cy);
        }
        for (const b of this.bells) {
            b.render(gfx, cx, cy, bloom);
        }
        for (const pr of this.prisms) {
            pr.render(gfx, cx, cy, this.tick);
        }
        this.greatPrism?.render(gfx, cx, cy, this.tick);
        for (const m of this.motes) {
            m.render(gfx, cx, cy, this.tick);
        }
        for (const sh of this.shades) {
            sh.render(gfx, cx, cy, this.tick);
        }
        if (withActors) {
            for (const m of this.popMotes) {
                m.render(gfx, cx, cy);
            }
            for (const e of this.enemies) {
                if (e.active) {
                    e.render(gfx, cx, cy);
                }
            }
            this.player.render(gfx, cx, cy, this.tick);
        }

        BT.cameraSet(new Vector2i(cx, cy));
        this.level.renderTufts(gfx, cx);
        BT.cameraReset();

        this.fx.render(gfx, cx, cy);
    }

    renderHud() {
        // motes
        gfx.draw('hudMote', 4, 4);
        gfx.text(`${this.moteCount}`, 10, 4, C.WHITE);
        // prisms
        for (let i = 0; i < this.prisms.length; i++) {
            const on = this.prisms[i].awake;
            gfx.draw(on ? 'hudPrismOn' : 'hudPrismOff', SCREEN_W - 26 + i * 7, 3);
        }
        if (this.player.glow) {
            gfx.draw('petal', 30, 2);
        }
        // the level's lost shades, found or not yet
        for (let i = 0; i < this.totalShades; i++) {
            gfx.draw(i < this.takenShades.size ? 'hudShadeOn' : 'hudShadeOff', 42 + i * 5, 4);
        }

        if (this.banner) {
            const t = this.banner.t;
            const slide = Math.min(1, t / 20) * (t > 170 ? Math.max(0, 1 - (t - 170) / 30) : 1);
            const y = Math.round(-10 + slide * 32);
            const w = gfx.textWidth(this.banner.text);
            const x = Math.round((SCREEN_W - w) / 2);
            gfx.rect(x - 6, y - 4, w + 12, 13, C.INK);
            gfx.frame(x - 6, y - 4, w + 12, 13, C.SPEC0 + (Math.floor(t / 6) % 6));
            gfx.text(this.banner.text, x, y, C.WHITE);
        }

        if (this.activeSign) {
            const text = this.signText(this.activeSign.index);
            const lines = gfx.wrap(text, SCREEN_W - 20);
            const h = lines.length * gfx.lineHeight + 7;
            const top = 12;
            gfx.rect(4, top, SCREEN_W - 8, h, C.UI_DARK);
            gfx.frame(4, top, SCREEN_W - 8, h, C.UI_DIM);
            let left = this.typed;
            lines.forEach((line, i) => {
                gfx.text(line, 10, top + 5 + i * gfx.lineHeight, C.WHITE, C.INK, left);
                left -= line.length + 1;
            });
        }

        if (this.touch.active && !this.paused && this.finaleTime < 0) {
            this.touch.render(gfx);
        }

        if (this.paused && this.pauseMenu) {
            this.dim();
            const h = 20 + this.pauseMenu.items.length * 11;
            const top = Math.round((SCREEN_H - h) / 2);
            gfx.rect(28, top, SCREEN_W - 56, h, C.INK);
            gfx.frame(28, top, SCREEN_W - 56, h, C.UI_DIM);
            gfx.textCentered('PAUZA', SCREEN_W / 2, top + 5, C.WHITE);
            this.pauseMenu.render(gfx, SCREEN_W / 2, top + 17, Math.floor(this.tick / 20) % 2 === 0);
        }
    }

    dim() {
        for (let y = 0; y < SCREEN_H; y++) {
            gfx.ditherRow('dither50', 0, y, SCREEN_W, C.INK);
        }
    }

    renderTitle() {
        // Josepho stands in the grey meadow
        const jx = 88;
        const jy = 88 - 12 - Math.round(this.camY);
        const name = this.tick % 200 > 190 ? 'j.blink' : this.tick % 80 < 40 ? 'j.idle0' : 'j.idle1';
        gfx.draw(name, jx, jy);

        const title = 'JOSEPHO';
        const scale = 3;
        const w = title.length * 4 * scale - scale;
        const x = Math.round((SCREEN_W - w) / 2);
        const wave = (i) => Math.round(Math.sin(this.tick * 0.06 + i * 0.7) * 1.5);
        // letters drawn one by one so each can bob
        for (let i = 0; i < title.length; i++) {
            gfx.bigText(title[i], x + i * 4 * scale, 22 + wave(i), scale, () => C.SPEC0 + ((i + Math.floor(this.tick / 10)) % 6));
        }
        gfx.textCentered('SVĚT, KTERÝ ZTRATIL BARVY', SCREEN_W / 2, 44, C.WHITE);
        if (this.titleMenu) {
            gfx.rect(44, 51, SCREEN_W - 88, 24, C.INK);
            this.titleMenu.render(gfx, SCREEN_W / 2, 56, Math.floor(this.tick / 20) % 2 === 0);
        } else if (Math.floor(this.tick / 30) % 2 === 0) {
            gfx.textCentered(this.touch.active ? 'KLEPNI PRO START' : 'STISKNI MEZERNÍK', SCREEN_W / 2, 100, C.MOTE);
        }
        if (fullscreen.isSupported) {
            gfx.tint('tbFull', 180, 4, C.INK);
            gfx.tint('tbFull', 179, 3, fullscreen.isOn ? C.MOTE : C.WHITE);
        }
        const version = `V${VERSION}`;
        gfx.text(version, SCREEN_W - gfx.textWidth(version) - 3, 100, C.UI_DIM);
    }

    renderStory() {
        this.dim();
        const page = STORY[this.storyPage];
        const lines = gfx.wrap(page, SCREEN_W - 32);
        const top = 40 - Math.floor((lines.length * gfx.lineHeight) / 2);
        let left = this.typed;
        lines.forEach((line, i) => {
            gfx.textCentered(line.slice(0, Math.max(0, left)), SCREEN_W / 2, top + i * gfx.lineHeight, C.WHITE);
            left -= line.length + 1;
        });
        const name = this.tick % 80 < 40 ? 'j.idle0' : 'j.idle1';
        gfx.draw(name, 91, 70);
        for (let i = 0; i < STORY.length; i++) {
            gfx.rect(84 + i * 7, 94, 4, 2, i === this.storyPage ? C.MOTE : C.UI_DIM);
        }
        if (this.typed >= page.length && Math.floor(this.tick / 25) % 2 === 0) {
            gfx.text('>', SCREEN_W - 12, 98, C.MOTE);
        }
        if (!this.touch.active) {
            gfx.text('ENTER PŘESKOČÍ', 4, 100, C.UI_DIM);
        }
    }

    renderClear() {
        this.dim();
        gfx.rect(8, 5, SCREEN_W - 16, 98, C.INK);
        gfx.frame(8, 5, SCREEN_W - 16, 98, C.SPEC0 + (Math.floor(this.tick / 8) % 6));
        gfx.textCentered(`${this.def.number}  ${this.def.name}`, SCREEN_W / 2, 13, C.MOTE);
        let y = 29;
        for (const line of this.def.clearText ?? []) {
            for (const l of gfx.wrap(line, SCREEN_W - 32)) {
                gfx.textCentered(l, SCREEN_W / 2, y, C.WHITE);
                y += gfx.lineHeight;
            }
            y += 4;
        }
        const secs = Math.floor(this.frames / 60);
        const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
        const shades = this.totalShades ? `   ODSTÍNY ${this.takenShades.size}/${this.totalShades}` : '';
        gfx.textCentered(`JISKRY ${this.moteCount}/${this.totalMotes}${shades}   ČAS ${time}`, SCREEN_W / 2, 72, C.GHOST);
        gfx.draw(this.tick % 40 < 20 ? 'j.happy' : 'j.idle0', 91, 79);
        if (this.stateTime > 60 && Math.floor(this.tick / 30) % 2 === 0) {
            gfx.textCentered(this.touch.active ? 'KLEPNI - NA MAPU' : 'MEZERNÍK - NA MAPU', SCREEN_W / 2, 95, C.UI_DIM);
        }
    }
}

bootstrap(Game);
