# V12 P0 artwork

Architecture/floor renders were generated from the user's V11/V12 approved references, with all HUD, avatars and movable furniture excluded. They are new production artwork, not the approved screenshot used as a flat gameplay background. `scene-art.js` mounts architecture and floor as separately clipped layers. Props are separate alpha WebP files; navigation and depth anchors are defined in `src/scene-layout.js`. Nave benches retain editable V9 SVG back/front layers.

Backgrounds: 1672 × 941 WebP. Furniture: cropped transparent WebP. All five backgrounds and eight shared props total approximately 1.8 MiB on disk. Only the active scene's assets are preloaded, with a bounded URL cache. No external image service is required at runtime.

Generated 2026-11-02 for this project using the supplied reference pack. The style and composition still need the owner's visual approval; automated screenshots only establish what the game actually rendered.
