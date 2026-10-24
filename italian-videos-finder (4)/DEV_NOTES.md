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
