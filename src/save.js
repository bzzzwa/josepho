// save.js - remembers which levels are finished, in the browser's local storage.
//
// Saved: { unlocked, current, done: { [levelNumber]: { motes, total, frames } }, inProgress }
// inProgress is the level being played: which lantern Josepho reached and what had changed by then (see
// Game.saveProgress). It lets "Continue" go straight back into the level after the page was closed.
// Every access is wrapped in try/catch: private windows and some embedded browsers refuse storage, and then
// the game simply starts fresh each time.

const KEY = 'josepho.save.v1';

export function emptySave() {
    return { unlocked: 1, current: 1, done: {}, inProgress: null };
}

export function loadSave() {
    try {
        const raw = globalThis.localStorage?.getItem(KEY);
        if (!raw) {
            return emptySave();
        }
        const data = JSON.parse(raw);
        return {
            unlocked: Math.max(1, Number(data.unlocked) || 1),
            current: Math.max(1, Number(data.current) || 1),
            done: typeof data.done === 'object' && data.done ? data.done : {},
            inProgress: typeof data.inProgress === 'object' && data.inProgress?.level ? data.inProgress : null,
        };
    } catch {
        return emptySave();
    }
}

export function writeSave(save) {
    try {
        globalThis.localStorage?.setItem(KEY, JSON.stringify(save));
    } catch {
        // storage unavailable: progress lasts only for this visit
    }
}

export function hasProgress(save) {
    return save.unlocked > 1 || Object.keys(save.done).length > 0 || !!save.inProgress;
}

/** Records a finished level, keeping the best mote count, and unlocks the next one. */
export function recordClear(save, number, result, levelCount) {
    const before = save.done[number];
    const best = !before || result.motes > before.motes || (result.motes === before.motes && result.frames < before.frames);
    if (best) {
        save.done[number] = result;
    }
    // lost shades: once found, a shade stays found
    save.done[number].shades = Math.max(result.shades ?? 0, before?.shades ?? 0);
    save.unlocked = Math.max(save.unlocked, Math.min(levelCount, number + 1));
    save.current = number;
    if (save.inProgress?.level === number) {
        save.inProgress = null;
    }
    return save;
}
