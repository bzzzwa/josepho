# Josepho

A platformer in the spirit of Mario and SuperTux on a tiny 192 x 108 screen, built with
[BLIT386](https://www.npmjs.com/package/blit386).

The world of Lumen has lost its colors: the Sorter split all light into two boxes, black and white. Josepho fits in
neither box - and so Josepho still carries every color. Wake the prisms and the palette itself comes back to life:
first the grass, then the sky, then the flowers. Returning colors also change the world - leaves, clouds and bell
flowers only become solid once their color is back.

Current version: **0.1.1** - Chapter 1, "Svitani" (Dawn). See `CHANGELOG.md`.

**Play it in your browser: https://bzzzwa.github.io/josepho/**

## Run it

You need [Node.js](https://nodejs.org) installed once (download the big LTS button). Then, in this folder:

```bash
npm install
npm run dev
```

A web address like `http://localhost:5173` appears. Open it in your browser to play.

| Action | Keys |
| --- | --- |
| Walk | Arrow keys or A / D |
| Run | Shift, X, J or Ctrl (hold) |
| Jump | Space, Z, K, Up or W - hold for a higher jump |
| Flutter | press jump again in the air and hold it - Josepho glides |
| Drop through a plank | Down + jump |
| Pause | Enter, Esc or P |

Stomp greylings, but never thornbacks - knock those off by bumping the block under them. Prism blocks hold motes of
light; one hides a glow petal that protects Josepho from one hit and lets you break stone bricks. Lanterns are
checkpoints.

## Change the game

Everything lives in `src/`, and nothing is loaded from files - all art and sound are generated at startup.

- `level1.js` - the map as plain text (a legend is at the top) plus the sign texts. Move a `?`, add an `e`, save.
- `art-data.js` - every sprite as rows of letters; each letter is a palette slot.
- `colors.js` - the palette and the grey-to-color system. Try other hex colors in `STATIC` or `SKY_KEYS`.
- `actors.js` - `PHYS` at the top holds jump height, speeds and flutter length.
- `sound.js` - synthesized sounds and the four-layer music.
- `game.js` - the rules, the story texts, the HUD and the screens.

More about hot reload: `docs/hot-reload.md`.

## Helpful commands

- `npm run dev` - start the game (the everyday command).
- `npx blit run` - the same thing, the friendly way.
- `npx blit doctor` - check your setup if something seems off.
- `npx blit upgrade` - update BLIT386 to the latest version.

The `blit` helper is installed inside this project, not on your whole computer, so it needs `npx` in front (it means
"run the helper that lives in this project"). Typing plain `blit` would say "command not found."

## Peek behind the scenes

While the game runs, you can open the engine overlay - a small panel showing frames per second and which renderer is
active.

- Keyboard: press the key just below Esc, in the very top-left corner of your keyboard. On US keyboards it is printed
  with `` ` `` and `~`. Classic PC games like Quake used that exact key to open their command console, and BLIT386 keeps
  the tradition. The engine listens for the key's position, not the symbol printed on it - on some keyboard layouts the
  `~` symbol sits somewhere else entirely, but the overlay key is still the one below Esc.
- No keyboard, or can't find the key? Click or tap the bottom-left corner of the game screen instead. That works
  everywhere: phones, tablets, the Steam Deck.

## Share your game

When you want to show your game to a friend:

```bash
npm run build
```

This packs everything into a `dist/` folder - a plain website, no server needed. Drag that folder onto a free static
host such as [Netlify Drop](https://app.netlify.com/drop) or [Cloudflare Pages](https://pages.cloudflare.com), and you
get a link anyone can open.

## When something breaks

It will - that is normal. Open `docs/when-something-breaks.md`. It explains how to read error messages and walks through
the usual suspects: blank screens, "command not found," forgotten `await`, and more.

## Learn more

- `AGENTS.md` - a short home base for you or an AI assistant.
- `docs/` - nine friendly guides: getting started, the game loop, drawing, input, colors, randomness and world
  generation, sound, hot reload, and fixing problems.
- [blit386.dev](https://blit386.dev) - the full BLIT386 documentation site. If you set up Claude Code or Cursor, it can
  search this site directly - that is what the `.mcp.json` file here (Claude Code) or `.cursor/mcp.json` (Cursor) is
  for.
- [blit386.dev/llms.txt](https://blit386.dev/llms.txt) - the whole site's contents as one plain text file, handy for
  skimming or pasting into a chat.

## License

Josepho is released under the MIT License - see `LICENSE`. The BLIT386 engine is a separate package with its own
license.
