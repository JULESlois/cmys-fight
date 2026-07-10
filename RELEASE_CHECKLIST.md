# CMYS Fight Release Checklist

## Automated gates

- [ ] `npm ci` succeeds on a clean checkout.
- [ ] `npm run verify` passes.
- [ ] Production server returns `200` for `/`, `/manifest.webmanifest`, `/sw.js`, and both icons.
- [ ] Offline reload works after one successful online load.
- [ ] Exported save imports successfully on a clean browser profile.
- [ ] Corrupt Run, Meta, and Settings values recover from their backup keys.

## Gameplay smoke

- [ ] Keyboard: start a Run, move, fire, use skill, interact, switch weapon, pause, buy, and select a Buff.
- [ ] Gamepad: repeat the keyboard smoke with left stick/D-pad and A/B/X/Y/LB/RT/Menu.
- [ ] Touch: repeat the smoke with joystick, FIRE, USE, SKILL, SWAP, and MENU.
- [ ] Complete `1-1 → 1-5` and verify Stage persistence, shop inventory, and Boss settlement.
- [ ] Debug build: use F7/F8/F9/F10 to inspect all chapters and final settlement.
- [ ] Complete one Normal and one Hard Mode Victory; verify no duplicate Run, challenge, or achievement rewards.

## Compatibility

- [ ] Chrome/Edge desktop latest.
- [ ] Firefox desktop latest.
- [ ] Safari desktop latest.
- [ ] Android Chrome in landscape, including display cutout safe areas.
- [ ] iOS Safari/PWA in landscape, including Home indicator safe area.
- [ ] Xbox-compatible controller and one PlayStation-compatible controller.

## Accessibility and presentation

- [ ] UI scales at 85%, 100%, and 125% without clipping critical controls.
- [ ] Deuteranopia and Tritanopia modes remain readable without relying only on color.
- [ ] Reduced Flash disables player/enemy hit flashes.
- [ ] Screen Shake off prevents all damage shake.
- [ ] Low-performance mode disables CRT, dynamic title motion, and shake after sustained low FPS.
- [ ] Tutorial prompts switch correctly between keyboard, gamepad, and touch.

## Data and deployment

- [ ] Production environment supplies `GEMINI_API_KEY` or accepts the fallback dialog behavior.
- [ ] HTTPS is enabled so Fullscreen, Service Worker, and PWA installation are available.
- [ ] Cache version in `public/sw.js` is incremented for each incompatible release.
- [ ] `dist/` contains manifest, service worker, icons, client assets, and `server.cjs`.
- [ ] Release commit and tag are created only after the checklist is signed off.
