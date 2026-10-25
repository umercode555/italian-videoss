# Script → Footage Studio: developer notes (for a new Claude session)

Chrome MV3 extension. Plain JS, no build step. Load unpacked from this folder.

## File map
| File | Part | Job |
|---|---|---|
| manifest.json | Config | Permissions, stock-site list, sandbox page + CSP |
| background.js | Downloads | Service worker. Fetches videos, saves to IndexedDB, advances active line, context menu, work timer |
| content.js | Stock sites | "Add to line N" hover button + bottom-right panel (line, progress, total time, live timer) |
| lib.js | Shared | IndexedDB helpers, script parser (`1: text \| keywords`), project mutate lock, search URLs |
| workspace.html / .css / .js | Workspace | Script list, footage preview, in-point, upload own clip, Resume, export JSON/media, Groq key |
| finder.html / .css / .js | Stock finder | Search 10 videos per script-line keyword on Pexels/Pixabay/Mixkit/Coverr/Videezy/Vecteezy; tick = HD download attached to that line as extra clip; untick = removed |
| finder-sites.js | Finder engines | `FINDER.search(site,q)`: fetch public search HTML (no API key), regex media URLs, return `{id,pv[],dl[],thumb,page,dur,w,h}`. Imported by background.js |
| editor-host.html / .js | Editor bridge | Normal extension page. Embeds editor.html, passes project + media blobs, saves editor projects, triggers downloads |
| editor.html | Video editor | Sandboxed page (needs inline handlers + eval). Timeline, canvas preview, Groq Whisper sync, line alignment, proxies, MP4 export. Inline copy of mp4-muxer + Montserrat fallback font |
| icon16/48/128.png | Icons | Toolbar/store icons |
| README.txt | Docs | Install + flow |
| tests/ | Tests | Headless Chromium tests (puppeteer-core + @sparticuz/chromium) |

## Data flow
stock site → content.js → background.js GRAB → IndexedDB `media` + chrome.storage `proj` → workspace.js (view/edit)
→ editor-host.js postMessage init → editor.html (sandbox). Editor saves via postMessage `saveP`.
Messages editor→host: ready, needWS, saveP, delP, putMedia, cfg, download, close.

## Editor internals (editor.html, search these names)
- `alignLines`, `runLines`: script line ↔ transcript alignment (LCS, fuzzy words), trim + place clips, report in `P.rep`.
- `mergeWS`, `addHostMedia`: import workspace lines/footage.
- `peaks`: waveform (all channels, full-resolution max, normalised to 98th percentile).
- `getR`, `syncEls`, `disposeR`, `loop`: preview playback. Lazy video elements, throttled draws, one seek in flight.
- `makeProxy`, `queueProxies`: 640px H.264 preview proxies for sources wider than 1920. Export never uses them (`msrc`).
- `drawT`: text. Montserrat 800, outline `ow` px (default 4), slight shadow.
- `exportVideo`: WebCodecs + mp4-muxer, always original media, 1920×1080.

## Rules
- No localStorage/IndexedDB inside editor.html (sandbox). Use postMessage to host.
- Keep edits surgical. Do not rebuild from scratch.
- Test: `cd tests && npm i puppeteer-core @sparticuz/chromium`, generate clips with ffmpeg (see script headers), run `node run.js`.

## Known limits
Live stock-site selectors untested. Google Fonts needs internet (embedded fallback otherwise). Groq free limits apply.

## Audio/preview/export architecture (v1.2)
- Audio: decoded to AudioBuffers (`bufFor`), scheduled with AudioBufferSourceNodes on the AudioContext clock (`schedAS`); that clock drives the timeline `T` while playing. Never use media-element audio sources (silent in the sandbox).
- Video: no <video> elements. mediabunny (inlined, WebCodecs) `CanvasSink` decodes frames: `pump` (playback, sequential iterator), `stillAt` (scrub). Each clip keeps its last frame in `R[id].cv`, so drawing never blocks or goes black.
- Export: mediabunny `Output` + `CanvasSource` + `AudioBufferSource`; one forward decoder per clip via `canvasesAtTimestamps`; encoder picked with `getFirstEncodableVideoCodec` (H.264 preferred). Audio mixed offline (`mixAudio`).
- Whisper language: `cfg.wl` ('auto' default). Do not force a language.
- Stock download: direct file fetch (no frames), 3 retries, byte progress.

## v1.3
- Download: parallel 2MB range requests (8 connections) when the server supports Range, else single stream; live timer/speed/ETA in the on-page panel and workspace.
- Multi-clip lines: `line.extra[]` (+ main clip fields). Each clip has `inT`/`outT` (trim). Editor splits the line's voiceover time between clips (`runLines`).
- Trim: workspace `openTrim` (filmstrip + two handles).
- Images/logos (v4): images in Uploads are overlay assets. Click or drag onto the player -> `addOverlay` (item `tr:'o'`, `aid`=media id). Each image has a keyword (`media.kw`, comma-separated alternatives). Existing Sync button ends with `placeAssets()`: one card per mention (`occ` index), start = phrase start-0.15s, 2-5s long; cards whose Start/Duration you edited (`man`) are never moved by Sync.

## v1.4 Stock Video Finder
- Message `FIND {site,q,limit}` -> background -> `FINDER.search`. `DROP {n,id}` removes one clip from a line (`SV.dropMedia`) and deletes its media.
- `GRAB` extra params: `append` (force extra clip), `noAdvance` (keep activeN), `key` (card id; progress in `dl.k`). Returns `mediaId`.
- Storage: `fndRes` (search cache keyed `site|keyword`, unchanged keywords never re-searched), `fndPick` (`{lineN:[{id,mediaId,site,title,dur,q}]}`), `fndSite`.
- Keyword lives in `line.kw` (shared with workspace). Picks are real clips on the line, so editor `runLines` places them by narration timing; no fixed timestamps.
- Selectors are regexes on raw HTML. Videezy/Vecteezy only expose preview files without login (card shows warning). If a site breaks, fix its `parse` in finder-sites.js.

## v1.5 Keyword mapping
- Finder groups by script segment. Keyword on line N of the keyword box -> segment N (blank line skips). `+ Add another keyword` under any segment adds an independent search linked to it. Store `fndQ: [{id,q,n,fp}]`.
- `SV.fp(text)` = sentence fingerprint. Stored on keywords/picks. Mismatch with current line text -> segment flagged ⚠ (`Confirm link` clears).
- `setScript` (workspace.js) re-pastes safely: exact-text match moves footage + fndQ/fndPick to the new number; same number but different text -> kept, `line.unc=true`, flagged; no match -> confirm dialog says footage will be removed.
- Paste modal: optional sentence splitting. Script keywords (`|`) no longer used by finder.

## v1.6 Own clips
- Any video file can join a segment: `＋ My clip` (per segment or per keyword), drag-drop onto a segment/keyword, `Import clips`, `Import folder` (names like `9.mp4`, `009_a.mp4`, `line-009.mp4` auto-link; others go to the Unassigned tray: pick keyword or type segment #).
- `picks(n)` = stored picks + any other clip on the line (workspace uploads, old projects), so every clip is visible/deselectable. `patchProbe` writes real dur/w/h/thumb after every add.

## v1.7 Persistent tray, dedupe, reorder
- Unassigned tray = `media` records with `tray:true` (IndexedDB; copy of the file bytes, not a disk link). Survives refresh/close. `editor-host.js` filters tray records out of the editor payload. Write failure -> red "NOT SAVED" row + toast; never silent.
- Duplicates: content hash (`hashBlob`): SHA-256 of whole file <=32 MB ("f:"), else size + 3x1 MB samples ("s:", probable). Same segment -> skipped; elsewhere/tray -> confirm. Name+size alone never counts.
- Reorder: `SV.reorder(p,n,ids)`; chips draggable + ◀ ▶. Order = main clip then `extra[]`, which is what editor-host sends.
- Fixed: paste-script modal was missing the sentence-split checkbox (threw on Load). Toast no longer hides save-failure warning.
- Tests: tests/ (see tests/README.md).

## v1.8 Search fixes
- Keywords are cleaned before any request: leading "4," removed, symbols stripped, `/ | ;` split into alternatives (max 4). Each alternative is searched separately and results are interleaved into one group of 10. Cause of the 404s: "/" and "," were URL-encoded into the search path (%2F, %2C).
- Tabs: NO automatic tabs. Plain fetch (with cookies) first for every site. Only if a site answers 403/429/503 AND "Tab fallback" is ticked, ONE reused background tab is used (serialized, closed after 12 s idle). Ticking a Videezy/Vecteezy clip still opens that same tab once to find the download link.
- Mixkit has tag pages, not free-text search: significant words are tried as tags (/free-stock-video/pharmacy/), results ranked by title words. Free downloads are 720p.
- `🩺 Diagnose` (toolbar) -> background `DIAG`: reports HTTP status, page title, media-URL counts, parsed items and HEAD status of download URLs. Use it to fix a site's parser.

## v1.9 Per-keyword source, More, keyword parsing
- ROOT CAUSE of "skips 2,4,6,8": keyword box had blank lines between keywords; v1.5 treated a blank line as "skip a segment", so keyword k landed on segment 2k-1. Now blank lines are ignored; `N: keyword` targets segment N (any order, duplicates become extra keywords); without numbers, order = segment order. Textarea prefill uses `N: keyword`.
- Each keyword (`Q[i].site`) has its own source dropdown (+ "All sites"); global dropdown = default for keywords without their own. RES key = `site|keyword`.
- `RES[k] = {items,shown,pg,sdone,sites,done}`: `pullPage` fetches the next page per source (`FIND {page}`), appends unseen items; `More clips` first reveals already-fetched items, then fetches the next page; disabled when every source is exhausted. Page params: Pexels `page`, Pixabay `pagi`, Mixkit/Videezy/Vecteezy/Coverr `page` (only Pexels/Mixkit verified by mock; others unverified).
- Status per keyword: queued/pending → searching → done/failed. Toolbar summary counts them.
- Vecteezy: route chain `/free-videos/<phrase>` → `/search?qterm=&content_type=video` → `/free-videos/<word>`; Videezy: `/free-video/<phrase>` → `/free-video/<word>`. 404 falls to next route. Previews for these two are resolved from the clip page via the single fallback tab (only with Tab fallback ticked).

## v1.10 Magnific + Artgrid
- Both are JS-rendered and paid/licensed (`js:1`, `paid:1`): need "Tab fallback" ticked to read results; excluded from "All free sites"; selecting asks for confirmation because previews are watermarked and clean downloads need a licence/login. Routes/regexes are unverified against the live sites (use Diagnose).
- Vista (create.vista.com/videos/<tag>/): JS-rendered, any .mp4/.webm on page becomes a card; download = same URL. Excluded from All free sites. Unverified live.

## v2.0 Client presets (jeans client)
- `PRESETS` / `PR()` in editor.html (search `client presets`). `cfg.preset`: `jeans` (default, new client) or `classic` (previous client, unchanged look). Switch in Settings tab. Applies to NEW items only; saved items keep their fields, so old projects render exactly as before.
- Text: item fields `anim:'pop'`, `sh:true`. `drawT` routes to `drawTA` (per-letter pop, centre-out stagger, overshoot, soft shadow, no outline) else untouched `drawT0` (original code).
- Logo/image overlays: `anim:'fly'` -> `flyP` + `drawM` (0.62s: big, rotated, blurred -> settles, slight rotation overshoot).
- Brand name: overlay with `brand:true` draws its keyword (`media.kw`, first alternative) in yellow below, at 83% height (`drawBrand`). Derived at draw time, nothing extra stored.
- Everything goes through `draw(g,t)`, so preview and MP4 export match. Stock video section untouched.
- Reference measurements (1280x720 ref): text colour #FDE209, brand text centre y=83%, width ~29% of frame; text pop ~0.27s; logo fly-in ~0.6s.

## v2.1
- Logo anim rewritten: `flyY`/`flyP` = damped spring from top-left, ~14% overshoot, rotation wobble, speed-based blur (~0.95s).
- Finder batching: only first `WIN` (50) segments rendered/searched. `Load next 50` (toolbar + bottom of list) raises `WIN` (`fndWin`) and searches the new ones. `Retry failed (N)` re-runs every failed keyword. One shared queue (`QL`) so buttons never start parallel runs. Auto retry once (1.5s) on a failed search.
- Speed: render throttled (300ms) during bulk search; `saveRes` debounced 1.2s (+ flush on pagehide); list limited to WIN segments.

## v2.2 HTTP 429
- Cause: Pexels (and CDNs) rate-limit bursts. Downloads used 8 parallel range requests, several downloads ran at once, and 4xx (incl. 429) was never retried.
- Fix (background.js): `rfetch` waits (Retry-After or 2.5s,5s,10s...) and retries 429/503; range parts 8 -> 3; `dlSlot` allows 2 downloads at once; outer retry loop now retries 429 with 5s/10s/15s waits. Finder thumbnails load 2 at a time (was 4).

## v2.3 Auto cooldown + speed
- Queue: a search that ends in 429/503/403 sets `COOL` (45s pause, queue resumes by itself), the keyword is re-queued up to 3 times, pacing `DELAY` grows (350 -> max 1500ms) and decays after successes.
- Speed: finder cards no longer create 10 `<video>` elements each up front. `.vph` placeholder -> real video only when scrolled into view (`mkVid`, IntersectionObserver). Full render with 300 segments / 3000 cards: 1430ms -> ~90ms. `.sg{content-visibility:auto}` skips offscreen layout.

## v2.4 Pexels API
- Scraping www.pexels.com triggers Cloudflare error 1015 (IP rate ban). `pexApi` in finder-sites.js uses api.pexels.com when `pexelsKey` is saved (toolbar button "Pexels API key"); same item shape/ids, so saved picks keep working. No key = old scraping.
- Cooldown now escalates after repeated throttles: 45s, 90s, 3m, 6m, 10m max (`CN`); resets after a success.
- API limit: 200 req/hour, 20k/month by default (higher limits free on request from Pexels).

## v2.5 Per-website pacing
- finder-sites.js `gate/penalize/reward`: one queue per host. Page hosts: 2.2s gap (pexels.com, pixabay.com), 1.6s others, +-20% jitter. Media hosts ('media' kind): 0.25s. API host: 0.3s.
- 429/503: host cooldown 15s, 30s, 60s ... (max 10 min, media max 60s), gap grows x1.5 (max 8s), shrinks x0.92 per success. Other hosts keep going.
- fetchPage retries up to 4x through the gate; if cooldown > 150s it throws so the finder-level pause (COOL, escalating) handles it.
- background.js `rfetch` (downloads) uses the same gate ('media').
- finder.js searchMany: 3 workers; different sites search in parallel, same site is serialized by the gate.
- Estimate: 223 keywords on one site ~ 6-8 min of paced requests.

## v2.6 Translations, Shutterstock, logo timing, text default
- Script format `N: Italian || English || keyword` (lib.js parseScript). English goes to `line.en` ONLY. Search/keyword/fp/editor-host/export use `text` and `kw`; `en` is never passed to the editor (editor-host maps n,text,... explicitly). Old formats (`N: text`, `text | keyword`, plain lines) unchanged. Paste dialog shows the format and a copyable DeepSeek prompt. English shown in glowing green (.en) in workspace list, finder segment header, and the on-page HUD (content.js).
- Shutterstock: ENG.Shutterstock + ssParse in finder-sites.js (paid library, js:1 -> Tab fallback if plain fetch is blocked, ?page=N paging, 4K/HD badge -> `rl` label, thumb/preview from /shutterstock/videos/<id>/..., page resolved on select). Clean footage needs the user's licence: app only gets watermarked previews. Parser is tested on fixtures, NOT against the live site (no network access when built).
- Logo slam-in slowed: flyY (z .45, w 9, v0 2), 1.5s, tilt wobble. Brand caption starts 0.45s after the logo.
- New text default: 140px, line height 1.35, box 1740x420 (measured from the reference export: "DI JEANS ECONOMICI" = ~1600px wide at 1080p).

## v1.1.0 (manifest) Logo fly-in re-measured from reference
Reference: "5 Marchi di Jeans..." clip, 30fps, scene starts frame 267 (8.90s). Measured darkness-weighted centroid of the logo every frame.
- Pure translation, no rotation/tilt (max angle error 3deg = blur noise). Old version wobbled/tilted: wrong.
- One line, ~25deg (y = 0.47 * x in px), enters from top-left off-screen.
- x(u) = e^(-3.796u) * (-0.4871 cos 11.633u + 0.2021 sin 11.633u), in fractions of canvas width (fit rms 0.0015). Passes final pos at +0.10s, overshoots +0.23W at +0.21s, undershoots -0.08W at +0.48s, +0.03W at +0.75s, settled ~1.4s (D=1.6s).
- Motion blur is directional and speed-proportional (sharp at turnarounds): sub-frame sampling over a 0.55-frame shutter, averaged with globalAlpha 1/(j+1). Replaces isotropic ctx.filter blur.
- Caption pop re-measured: fully in within 3 frames (~0.1s): stagger 0.025s, letter grow 0.09s (was 0.075 / 0.19).
- Extension icons redrawn (play + yellow caption bars).


## v1.1.1 White background + automatic logo cutout
- `addBg()` (editor.html, search "white background + auto logo cutout"): item `{k:'bg',tr:'v',col:'#fff',d:2.8}` on the video track, inserted at the playhead. Drawn in `drawM` (solid fill), so preview and export match. Button: Uploads tab "+ White background (2.8s)". Colour editable in Edit tab.
- `cutScan()` runs at the end of every `commit()`. Opt-in (v1.1.2): an image overlay overlapping a `bg` clip shows a "Remove background" checkbox (Edit tab, unticked by default; `it.rmbg`). Only when ticked is the background removed: `ensureCut` -> `cutRpc` -> parent message `cut` -> editor-host.js `cutBg` (extension page) -> `cutDone` -> new media `<name>-nobg.png` (`media.cutOf` = original, original `media.cutId`). Overlay keeps `aid` = original (keyword/brand text still work), `mid` = cutout, `cut:1`. Images that already have transparency are skipped. Cutout is cached per original image; hidden from the Uploads grid. Unticking restores the original instantly (`cutToggle`); re-ticking reuses the cached cutout.
- Engine: `bg/` = @imgly/background-removal 1.4.5 (IS-Net, model "medium"/fp16, onnxruntime-web wasm, fully offline, no network). Bundled to `bg/bgremove.mjs` with esbuild; `ndarray` replaced by a 10-line shim (the original uses `new Function`, blocked by MV3 CSP); ORT forced to 1 thread / no workers. Output cropped to the subject (2% pad). `bg/resources.json` lists only the files shipped. Switch to the smaller model: change `model:'medium'` to `'small'` in editor-host.js and drop the medium chunks (saves ~44 MB).
- manifest: extension_pages CSP gained `'wasm-unsafe-eval'` (required for onnxruntime wasm).
- License: imgly background-removal is AGPL-3.0 (see bg/LICENSE-imgly-AGPL.md).
- Test: `node tests/bg-test.mjs` (needs puppeteer-core + @sparticuz/chromium). Checks 2.8s default, auto cutout, alpha, rendered frame, cache reuse, opt-out.

## v1.1.2 Opt-in background removal + finder keyboard shortcuts
- Removal is OFF by default. `cutScan` only processes overlays with `rmbg:1`. addOverlay now opens the Edit tab so the checkbox is visible at once.
- Finder keys (end of finder.js, IIFE "keyboard navigation"): modelled on Pinterest-Products-Grabber grid.js (focus ring, WASD/arrows, Enter opens, Enter saves, Esc closes). State = `{qid, vk}` (keyword block + clip id), re-applied after every `renderNow` (wrapped), so it survives re-renders. Keys: arrows/WASD move (rows/cols measured from layout, continues into next/previous keyword), Enter = preview, Enter in preview = `#pvS.click()` (original close + select() download path), Esc closes (existing handler), Q/E or [ ] or Shift+Up/Down = previous/next keyword, / or F = edit keyword, M = more clips, U = remove saved clip, ? = hide hint bar. In preview, arrows/WASD switch clip. Ignored when typing in INPUT/TEXTAREA/SELECT, with Cmd/Ctrl/Alt held, during Diagnose modal, and Enter ignores key-repeat. Enter on an already-saved clip never deselects. Highlight = `.vc.kf` (amber ring), active keyword = `.ln.kact`.
- Test: `node tests/finder-keys-test.mjs`.
