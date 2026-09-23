// sound.js - every sound in Josepho is synthesized at startup; there are no audio files.
//
// Music is a tiny sequencer: four instruments, each a single synthesized note that is replayed at different
// pitches. The world starts with only a quiet bass line; every color that comes back adds an instrument.

import { AudioClip, BT } from 'blit386';

const STEP_FRAMES = 8; // one sixteenth note = 8 frames (about 112 beats per minute)

function midiToHz(m) {
    return 440 * 2 ** ((m - 69) / 12);
}

// Four chords, 16 steps each: D, B minor, G, A.
const BASS = [38, 35, 31, 33];
const ARP = [
    [62, 66, 69, 74],
    [59, 62, 66, 71],
    [55, 59, 62, 67],
    [57, 61, 64, 69],
];
// step -> note, per chord
const MELODY = [
    { 0: 78, 4: 76, 6: 74, 8: 69, 12: 71 },
    { 0: 74, 4: 71, 8: 66, 10: 69, 12: 71 },
    { 0: 67, 2: 69, 4: 71, 8: 74, 12: 76 },
    { 0: 73, 4: 76, 8: 69, 11: 71, 14: 73 },
];

export class Sound {
    clips = {};
    queue = [];
    frame = 0;
    step = 0;
    layers = 1;
    musicOn = true;

    async init() {
        const synth = (params) => AudioClip.synth(params);
        const env = (attack, decay, sustain, release) => ({ attack, decay, sustain, release });

        const defs = {
            jump: { waveform: 'square', frequency: 300, duration: 0.16, pitchSweep: { toFrequency: 620 }, dutyCycle: 0.25, volume: 0.35, envelope: env(0, 0.04, 0.5, 0.08), seed: 3 },
            flutter: { waveform: 'triangle', frequency: 900, duration: 0.07, pitchSweep: { toFrequency: 1300 }, volume: 0.18, envelope: env(0, 0.02, 0.3, 0.03), seed: 4 },
            mote: { waveform: 'square', frequency: 988, duration: 0.14, pitchSweep: { toFrequency: 1976 }, dutyCycle: 0.5, volume: 0.25, envelope: env(0, 0.03, 0.6, 0.06), seed: 5 },
            stomp: { waveform: 'square', frequency: 220, duration: 0.12, pitchSweep: { toFrequency: 90 }, noiseMix: 0.3, volume: 0.4, envelope: env(0, 0.03, 0.3, 0.05), seed: 6 },
            bump: { waveform: 'triangle', frequency: 140, duration: 0.09, pitchSweep: { toFrequency: 90 }, volume: 0.5, envelope: env(0, 0.02, 0.4, 0.04), seed: 7 },
            break: { waveform: 'noise', frequency: 200, duration: 0.25, volume: 0.35, envelope: env(0, 0.05, 0.3, 0.15), seed: 8 },
            power: { waveform: 'square', frequency: 523, duration: 0.5, pitchSweep: { toFrequency: 1568 }, vibrato: { rate: 14, depth: 40 }, dutyCycle: 0.5, volume: 0.3, envelope: env(0.01, 0.1, 0.7, 0.2), seed: 9 },
            hurt: { waveform: 'square', frequency: 440, duration: 0.3, pitchSweep: { toFrequency: 140 }, vibrato: { rate: 30, depth: 30 }, volume: 0.35, envelope: env(0, 0.05, 0.5, 0.15), seed: 10 },
            death: { waveform: 'triangle', frequency: 660, duration: 0.9, pitchSweep: { toFrequency: 110 }, vibrato: { rate: 8, depth: 20 }, volume: 0.45, envelope: env(0, 0.2, 0.6, 0.4), seed: 11 },
            splash: { waveform: 'noise', frequency: 400, duration: 0.35, volume: 0.3, envelope: env(0, 0.08, 0.3, 0.2), seed: 12 },
            spring: { waveform: 'square', frequency: 200, duration: 0.3, pitchSweep: { toFrequency: 900 }, vibrato: { rate: 20, depth: 25 }, dutyCycle: 0.25, volume: 0.3, envelope: env(0, 0.05, 0.6, 0.15), seed: 13 },
            lantern: { waveform: 'sine', frequency: 784, duration: 0.6, vibrato: { rate: 6, depth: 6 }, volume: 0.35, envelope: env(0.01, 0.15, 0.5, 0.35), seed: 14 },
            text: { waveform: 'square', frequency: 1200, duration: 0.025, dutyCycle: 0.25, volume: 0.12, envelope: env(0, 0.01, 0.2, 0.01), seed: 15 },
            prism: { waveform: 'sine', frequency: 440, duration: 2.2, pitchSweep: { toFrequency: 880 }, vibrato: { rate: 5, depth: 12 }, volume: 0.45, envelope: env(0.05, 0.4, 0.6, 1.2), seed: 16 },
            // instruments (one note each; the sequencer changes the pitch)
            bass: { waveform: 'triangle', frequency: 110, duration: 0.5, volume: 0.5, envelope: env(0.005, 0.15, 0.5, 0.25), seed: 20 },
            arp: { waveform: 'square', frequency: 440, duration: 0.14, dutyCycle: 0.2, volume: 0.13, envelope: env(0, 0.04, 0.3, 0.06), seed: 21 },
            lead: { waveform: 'triangle', frequency: 440, duration: 0.42, vibrato: { rate: 5, depth: 4 }, volume: 0.28, envelope: env(0.01, 0.1, 0.6, 0.2), seed: 22 },
            bell: { waveform: 'sine', frequency: 880, duration: 0.6, volume: 0.16, envelope: env(0, 0.08, 0.3, 0.45), seed: 23 },
        };
        const names = Object.keys(defs);
        const clips = await Promise.all(names.map((n) => synth(defs[n])));
        names.forEach((n, i) => {
            this.clips[n] = clips[i];
        });
        return true;
    }

    play(name, options = {}) {
        const clip = this.clips[name];
        if (!clip || !BT.isAudioUnlocked) {
            return;
        }
        BT.soundPlay(clip, options);
    }

    /** Plays a note (MIDI number) on an instrument clip tuned to baseHz. */
    note(name, midi, baseHz, volume = 1) {
        this.play(name, { pitch: midiToHz(midi) / baseHz, volume });
    }

    /** Plays a little rising arpeggio, one note every few frames (for power-ups and prisms). */
    arpeggio(notes, gap = 4, instrument = 'arp', volume = 1.4) {
        notes.forEach((m, i) => {
            this.queue.push({ at: this.frame + i * gap, name: instrument, midi: m, volume });
        });
    }

    update() {
        this.frame++;
        for (const q of this.queue) {
            if (q.at <= this.frame) {
                this.note(q.name, q.midi, q.name === 'bell' ? 880 : 440, q.volume);
                q.done = true;
            }
        }
        this.queue = this.queue.filter((q) => !q.done);

        if (!this.musicOn || this.frame % STEP_FRAMES !== 0) {
            return;
        }
        const s = this.step;
        this.step = (this.step + 1) % 64;
        const chord = Math.floor(s / 16);
        const within = s % 16;

        // bass: always
        if (within === 0 || within === 8 || within === 11) {
            this.note('bass', BASS[chord] + (within === 11 ? 12 : 0), 110, within === 11 ? 0.5 : 0.9);
        }
        // arpeggio: after green returns
        if (this.layers >= 2 && within % 2 === 0) {
            const tones = ARP[chord];
            this.note('arp', tones[(within / 2) % 4], 440, 0.9);
        }
        // melody: after the sky returns
        if (this.layers >= 3) {
            const m = MELODY[chord][within];
            if (m) {
                this.note('lead', m, 440, 0.9);
            }
        }
        // bells: after the flowers return
        if (this.layers >= 4 && (within === 3 || within === 7 || within === 14)) {
            const tones = ARP[chord];
            this.note('bell', tones[(within + chord) % 4] + 12, 880, 0.8);
        }
    }
}
