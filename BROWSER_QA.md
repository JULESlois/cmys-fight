# CMYS Fight Browser QA

## 1. Test URLs

Normal production preview:

```text
http://localhost:3000/
```

Browser QA mode:

```text
http://localhost:3000/?qa=1
```

QA mode is intentionally enabled only by the `qa=1` query parameter. The normal URL does not render QA controls.

## 2. First-load procedure

1. Open the QA URL in Chrome.
2. Tap once anywhere to unlock Web Audio.
3. Reload once so the Service Worker can become the active controller.
4. Open the QA panel and press **RUN CHECKS**.
5. Expected result: zero failures. A warning for Web Audio is acceptable only before the first user interaction. A Service Worker warning is acceptable only before the first reload.

## 3. Visual scene pass

Use the stage buttons in the QA panel:

- `1-1`: Forest palette, natural particles and green grading.
- `2-1`: Dungeon palette, stone seams and purple grading.
- `3-1`: Snow palette, ice cracks and readable dark outlines.
- `4-1`: Lava palette, basalt cracks and orange glow.
- `FINAL`: final-stage layout; enter the boss room to verify the double warning border and Boss music.

For each scene:

1. Confirm the player and enemies remain distinct from the floor.
2. Confirm HUD text does not clip at the current screen aspect ratio.
3. Fire several shots and verify muzzle, hit and critical particles.
4. Press **SCREENSHOT** to export a PNG.

## 4. Audio pass

1. Select each music scene from the QA panel.
2. Confirm the scene changes without overlapping old tracks.
3. Press **SFX DEMO** and verify all six effects are audible and distinct.
4. Switch between `ADAPTIVE`, `EXTERNAL`, and `OFF`.
5. With the default empty external track configuration, `EXTERNAL` must fall back to procedural music.
6. Press **EXTERNAL FALLBACK**. Expected result: `PASS · procedural`.

The fallback probe temporarily requests an intentionally missing localhost audio file, confirms procedural recovery, and restores the previous audio settings.

## 5. State and persistence pass

1. Open Title, Hub, Settings, Character Select and Dungeon from the QA panel.
2. Jump between `1-1`, `2-1`, `3-1`, `4-1`, and `FINAL`.
3. Press **LOADOUT**, then verify Laser, Shotgun, full resources and debug buffs.
4. Save, reload the page and continue the run.
5. Confirm stage, weapons, buffs, coins and player resources restore correctly.

## 6. DevTools bridge

QA mode exposes:

```js
window.__CMYS_QA__
```

Useful commands:

```js
await window.__CMYS_QA__.runChecks()
window.__CMYS_QA__.snapshot()
window.__CMYS_QA__.jumpToStage(16)
window.__CMYS_QA__.grantLoadout()
window.__CMYS_QA__.setMusicScene("boss")
await window.__CMYS_QA__.probeExternalFallback()
window.__CMYS_QA__.capturePng()
```

This API is intended for future Playwright/WebDriver integration on a desktop CI runner.

## 7. Report collection

Press **COPY REPORT** after running checks. If clipboard access is unavailable, the panel downloads a JSON report instead.
