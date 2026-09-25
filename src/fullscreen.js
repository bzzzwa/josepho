// fullscreen.js - puts the page into fullscreen and turns the phone to landscape.
//
// BLIT386 does not switch to fullscreen by itself, so this uses the browser's Fullscreen API directly.
// Browsers only allow that from inside a real user gesture (a tap ending or a key press). The game cannot
// call it from update(), so it just asks - request() - and the next pointerup / touchend / keydown on the
// page carries the request out.
//
// iPhone Safari has no fullscreen for web pages at all. There the page can be added to the home screen
// (Share -> Add to Home Screen) and then opens without browser bars - see index.html and
// public/manifest.webmanifest.

const hasDom = typeof document !== 'undefined';

function element() {
    return hasDom ? document.documentElement : null;
}

// A request left over from a tap that ended too quickly is dropped after this long, so a later, unrelated
// tap does not suddenly switch to fullscreen.
const PENDING_MS = 1500;

export const fullscreen = {
    pending: false,
    pendingAt: 0,
    installed: false,

    /** Can this browser make the page fullscreen? (false on iPhone) */
    get isSupported() {
        return hasDom && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
    },

    get isOn() {
        return hasDom && !!(document.fullscreenElement || document.webkitFullscreenElement);
    },

    /** Call once at startup (calling again, e.g. after a hot reload, does nothing). */
    install() {
        if (!hasDom || this.installed) {
            return;
        }
        this.installed = true;
        const onGesture = () => {
            if (this.pending) {
                this.pending = false;
                if (performance.now() - this.pendingAt < PENDING_MS) {
                    this.toggleNow();
                }
            }
        };
        window.addEventListener('pointerup', onGesture, true);
        window.addEventListener('touchend', onGesture, true);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyF' && !e.repeat) {
                this.pending = false;
                this.toggleNow();
            } else {
                onGesture();
            }
        });
    },

    /** Ask to toggle fullscreen at the next user gesture. */
    request() {
        if (this.isSupported) {
            this.pending = true;
            this.pendingAt = performance.now();
        }
    },

    /** Ask to enter fullscreen (does nothing if already on). */
    requestEnter() {
        if (!this.isOn) {
            this.request();
        }
    },

    toggleNow() {
        try {
            if (this.isOn) {
                const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
                exit?.call(document);
                return;
            }
            const el = element();
            const enter = el?.requestFullscreen ?? el?.webkitRequestFullscreen;
            if (!enter) {
                return;
            }
            Promise.resolve(enter.call(el, { navigationUI: 'hide' }))
                .then(() => screen.orientation?.lock?.('landscape'))
                .catch(() => {});
        } catch {
            // the browser refused; the game simply stays in the window
        }
    },
};
