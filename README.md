# Nothin’ — interactive reference build

A Next.js App Router recreation of the visual direction and interactions in the supplied recording of https://www.noth.in/. Built with React, TypeScript, `motion/react`, Lenis and a custom GLSL shader.

## Run

```sh
cd D:/website-portfolio/void-portfolio
npm install
npm run dev
```

Open http://localhost:3000. For production: `npm run build` then `npm start`.

## Components and tuning

- `app/components/ink-hero.tsx`: client-only lifecycle for the Three.js fluid reveal. It handles pointer/touch input, viewport visibility, context loss, reduced motion and cleanup. Three.js is dynamically imported. Static typography remains available when WebGL or autoplay is unavailable.
- `app/components/fluid-reveal.ts`: GPU fluid simulation adapted from the supplied `temp/main.js`. Half-float ping-pong targets store velocity, pressure and dye. The pass order matches the reference: pointer splats, velocity advection, dye advection, divergence, 20 pressure iterations, pressure-gradient subtraction and mask compositing. `FLUID_SETTINGS` retains the original 256/512 resolutions, 0.962/0.988 dissipation, 5900 force and 3.9/0.5/0.01 reveal values. The brush radius is widened from 0.00006 to 0.0006 for thicker trails. The 150svh canvas spans the hero and intro heading; the video remains centered over the hero wordmark. The reference's zero-strength curl passes are omitted. A fixed 60 Hz simulation clock keeps trail speed consistent on high-refresh displays. Scroll progressively weakens the input and accelerates dye decay.
- `app/components/fluid-shaders.ts`: the six active simulation shaders extracted from the supplied bundle. The final composite uses the same dye threshold while keeping the base wordmark as accessible DOM. Video fits the full width and centers vertically, matching the CSS injected by the reference JavaScript. There is no artificial texture distortion or procedural edge noise. The supplied standalone CSS is Webflow's shared foundation; hero-specific layer rules are embedded in `main.js`.
- `app/components/smooth-scroll.tsx`: Lenis runs its own frame loop. The `100 * tanh(delta / 100)` soft cap retains fine trackpad movement and limits unusually large wheel steps after Lenis normalizes delta units. No user-agent detection. Native touch inertia is retained (`syncTouch: false`) to avoid double smoothing on iOS. `lerp` controls the settling response. This reduces input extremes; it cannot make different physical devices identical.
- `app/components/experience.tsx`: viewport reveals observe an unclipped outer frame with `useInView`, then animate an inner mask from the original corner/bottom clip paths. This avoids a zero-intersection deadlock when an observed element is itself fully clipped. There is no animated image scale; the inner image independently traverses -8% to +8% using `useScroll`. The exhibition has a sticky viewport and a shared scene coordinate system, with the final video registered to the hall. A ResizeObserver computes the initial full-screen scale; mobile resolves to a complete letterboxed hall. Also contains project data, accessible native dialogs, sound/pause controls, page sections and contact links.
- `app/components/showreel.tsx`: the original local showreel replaces the static intro thumbnail. A sticky stage shrinks its frame from full width into the right-hand column, using `useScroll`, a spring and the reference power4 easing. The film retains its 8:5 aspect ratio at rest, pauses off-screen and has manual playback control. Mobile uses a larger final frame; reduced motion removes the long pin.
- `app/components/object-playground.tsx`: object layout and repulsion adapted from `Kv()` in the supplied bundle and the slow-pointer recording. Forces originate at fixed resting anchors, allowing broad arcs even on slow pointer sweeps. Desktop reach is 460px, travel is up to 380px, rotation up to 30 degrees and enlargement up to 20%; mobile uses 260px/110px/12 degrees/10%. A 450ms power4 escape transitions to a 1200ms elastic return. The apparent depth is enlargement and overlap, matching the reference rather than adding 3D tilts. Small letter marks react independently. Pointer tracking updates during scroll and touch remains passive.
- `app/components/object-motion.ts`: deterministic proximity/easing calculations. Run `node --test tests/object-motion.test.mjs` with Node 22.18+ to check slow approaches, arc paths, elastic settling, retargeting and mobile bounds.
- `app/globals.css`: responsive layout, typography, reduced-motion fallbacks and visual styling.

## Media

Reference artwork and films are stored locally under `public/media`; `sources.json` records their source URLs. They originate from Nothin’s supplied reference, not newly created portfolio projects. Replace the assets, project copy, branding and contact destinations when adapting this build for another studio. The original reference media is approximately 82 MB, mostly the three MP4 films. The exhibition film loads on approach and pauses off-screen. Images use WebP/JPEG and Next Image where appropriate.

## Validation

- `npm run lint`: passes without warnings.
- `npm run build`: passes compilation, TypeScript and static generation.
- Local HTTP route responds with 200; all three local MP4 files decode successfully.
- The connected browser tool exposed no available browsers during implementation. Live visual verification, interaction testing and physical Mac/Windows/mobile scroll comparisons remain to be done; build checks do not establish visual or device parity.

Suggested hands-on checks: sweep the hero, open/close the menu and project dialogs with mouse and keyboard, scroll each reveal in both directions, inspect exhibition alignment at desktop and portrait widths, test sound/pause, move toward the floating objects, and enable reduced motion.
