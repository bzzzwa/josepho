import { defineConfig } from 'vite';
import { blit386 } from 'blit386/vite';

// Vite is the little web server that runs your game while you work on it.
// The blit386() plugin makes your edits appear in the running game without
// restarting it, keeping your score and position when possible (hot reload).
// You usually do not need to change anything else here.
export default defineConfig({
    // Relative paths, so the built game works from any folder - on GitHub Pages it lives at
    // https://bzzzwa.github.io/josepho/, not at the root of a domain.
    base: './',
    plugins: [blit386()],
    server: {
        // Open the game in your browser automatically when you run `npm run dev`.
        open: true,
    },
});
