// Node module hook: when the game imports 'blit386', hand it the test double instead of the real engine.
export async function resolve(specifier, context, next) {
    if (specifier === 'blit386') {
        return { url: new URL('./mock-blit386.mjs', import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
}
