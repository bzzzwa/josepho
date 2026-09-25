// audio-unlock.js - makes sound start on phones.
//
// Browsers keep Web Audio silent until the player interacts with the page, and only some events count as
// that interaction: a key press, a mouse press, or the END of a touch (touchend / pointerup / click).
// The BLIT386 engine (1.7) tries to start its audio when a touch BEGINS (touchstart / pointerdown). On a
// desktop the first key press starts it fine, but on Android and iPhone the touch start does not count, the
// engine's attempt never succeeds, and the game stays silent.
//
// The fix: remember every AudioContext the page creates (the engine makes one at startup), and resume them
// from the events phones do accept. Once the context is running, the engine's own pending start finishes
// and BT.isAudioUnlocked turns true. This module must be imported before bootstrap() runs - game.js
// imports it near the top. It does nothing outside a browser.

const contexts = [];

function resumeAll() {
    for (const ctx of contexts) {
        // 'suspended' before the first gesture; 'interrupted' on iPhone after a call or switching apps
        if (ctx.state !== 'running' && ctx.state !== 'closed') {
            ctx.resume().catch(() => {});
        }
    }
}

if (typeof window !== 'undefined') {
    const Native = window.AudioContext ?? window.webkitAudioContext;
    if (Native && !Native.isJosephoTracked) {
        class TrackedAudioContext extends Native {
            static isJosephoTracked = true;

            constructor(...args) {
                super(...args);
                contexts.push(this);
            }
        }
        window.AudioContext = TrackedAudioContext;

        for (const type of ['touchend', 'pointerup', 'click', 'keydown']) {
            window.addEventListener(type, resumeAll, { capture: true, passive: true });
        }
    }
}

export {};
