# CLAUDE.md — yeti-login

## What This Is

Interactive 3D "Panda AI" landing page featuring a rigged Po character (Kung Fu Panda) that tracks the user's mouse cursor. A dumpling on chopsticks follows the cursor — hold it near Po's mouth for 3 seconds and he eats it with a multi-stage animation sequence. Scene includes procedural grass (500K instanced blades with GPU wind), scattered bamboo stalks, a painted sky gradient, 3D chat bubbles, and a synthesized "Oogway Ascends" soundtrack.

## Stack

- **Vanilla HTML/CSS/JS** — no build tools, no bundler, no framework
- **Three.js 0.167** loaded via ES Module import map from CDN
- **GLTFLoader** for 3D models
- **Web Audio API** — synthesized music (Oogway Ascends), no audio files
- **Inter** + **Go3v2** fonts (Go3v2 used for chat bubbles)

## File Layout

| File | Purpose |
|------|---------|
| `index.html` | Entry point — loader overlay, canvas, import map |
| `scene.js` | Main file (1800 lines) — Three.js scene, model loading, bone tracking, eat state machine, arm IK, grass/bamboo/sky, chat bubbles, music synth |
| `script.js` | Legacy DOM-based yeti controller (unused, not loaded) |
| `style.css` | Loader (animated panda face CSS), toast, fullscreen canvas |
| `debug.html` | Bone rig debug tool with slider panel for posing |
| `models/po.glb` | Rigged Po character model |
| `models/dumpling.glb` | Dumpling + chopsticks model (Object_6 = bun, Object_2 = sticks) |
| `models/bamboo.glb` | Bamboo stalk model (cloned procedurally) |
| `models/yeti-*.glb` | Earlier yeti model iterations (unused) |
| `assets/go3v2.ttf` | Custom font for chat bubbles |
| `assets/yeti.png` | Static yeti image (unused) |
| `frames/` | JPEG frame sequence (unused) |

## Architecture

### Bone Tracking (scene.js)
Po's skeleton is driven by named bones (see `BONE_NAMES` map). Mouse position is normalized to NDC, then mapped to bone rotation targets with per-joint damping:
- **Eyes** (`cc_eye_l/r`) — fastest (0.15), raycast to 3D cursor plane for true lookAt
- **Head** (`head_038_44`) — medium (0.06), main tracking joint
- **Neck** (`neck_01_037_43`) — distributes 30% of head tracking
- **Spine** (`spine_02_01_6`) — slowest (0.02), subtle body sway
- **Jaw** (`cc_jaw_043_49`) — opens wider as dumpling approaches mouth

### Arm System
Arms use a custom pseudo-IK solver (`solveArm()`):
- T-pose is relaxed down with `rotation.z ± 1.2` offset
- Arms reach toward dumpling based on proximity (`reach` 0→1)
- Each arm's reach is weighted by dumpling's horizontal position (left arm reaches more when food is on the left)
- Clavicle, upperarm, forearm, and hand bones all participate
- Idle sway via `breathPhase` oscillation

### Eat State Machine
```
tracking → anticipation (1.0s) → lunge (1.9s) → proud (1.5s) → respawn (2.8s) → tracking
```

**Triggering**: Dumpling must stay within 0.92 units of head for 3 continuous seconds. During this buildup, Po shows increasing eagerness — head wobbles faster, leans toward food, jaw opens anticipatorily.

**States in detail**:
- **tracking**: Dumpling follows cursor, bones track mouse, arms reach when food is near, jaw opens proportional to distance
- **anticipation** (1.0s): Head pulls back, jaw opens wide, eyes lock on dumpling. Chopsticks detach from dumpling, get physics velocity, and fall away with spin + fade. Dumpling drifts slowly toward mouth
- **lunge** (1.9s): Head snaps forward in 4 rapid chomps (jaw oscillates). Dumpling shrinks to zero on first chomp. Head pitches down then up per chomp cycle. Chat bubble: "Yum!"
- **proud** (1.5s): Ta-da celebration pose. Arms spread out, chest puffed, head tilts back. Right hand does belly-rub oscillation. Chat bubble: "I'm happy!"
- **respawn** (2.8s): Bones lerp back to rest pose. After 1.8s, new dumpling materializes at cursor position with scale-up animation. Chopsticks reattach to original parent with original transform

### Chopstick Physics
When eating begins (anticipation state):
- Chopsticks mesh is reparented to scene root (detached from dumpling)
- World transform is preserved via `getWorldPosition/Quaternion/Scale`
- Random velocity + angular velocity applied (gravity + spin)
- Opacity fades to 0 over 1.2s
- On respawn: reparented back to original dumpling parent, local transform restored

### 3D Chat Bubbles
Canvas-texture sprites rendered in 3D space:
- Dynamic text rendered to `<canvas>` with Go3v2 font
- Bubble shape with tail pointing toward Po
- Drop shadow, rounded corners
- Positioned to the right of Po's head (0.35, 1.75, 1.0)
- Fade in (0.4s) → hold (3.0s - fade times) → fade out (0.4s)
- Auto-disposed after animation completes

### Environment
- **Sky**: Custom `ShaderMaterial` on inverted sphere — 3-color gradient (top blue → mid sky → pale horizon) with sun glow (tight + broad haze)
- **Ground**: `MeshStandardMaterial` green plane with procedural grass on top
- **Grass**: `InstancedMesh` (500K blades desktop, 100K mobile) — cone geometry, 6-color palette, GPU wind via `onBeforeCompile` shader injection (two-layer sine wave, height-weighted sway)
- **Bamboo**: 50 clones (25 mobile) procedurally scattered with seeded RNG. Avoid clear radius around Po. CPU-side wind sway per stalk. Materials lightened 35%
- **Lighting**: Ambient (0.8) + directional key (2.0, casts shadows) + fill (-2,1,2) + rim (0,2,-3). PMREM environment map from hemisphere light for reflections
- **Shadows**: PCFSoftShadowMap (PCFShadowMap on mobile), 2048px (1024 mobile), bias -0.0005, radius 4, blur 16 samples. Additional shadow-only plane under character

### Music — Oogway Ascends Synthesizer
Fully synthesized "Oogway Ascends" (Sky: Children of the Light version) via Web Audio API:
- **No audio files** — all generated in real-time
- 15-note C major scale (C4–C6) mapped to Sky Music note indices
- 130+ note events with millisecond timestamps, loops at 58s
- Each note: triangle oscillator → gain envelope (attack 0.08s, sustain, release 0.8s) → reverb
- Convolution reverb created from noise-based impulse response (2.5s, decay curve)
- Master gain with fade in/out
- Toggle button (♪) in bottom-right corner
- Auto-starts on first user interaction (browser autoplay policy)

### Performance
- Grass uses `InstancedMesh` with GPU-side wind via `onBeforeCompile` shader injection — zero CPU cost for 500K blades
- Mobile detection reduces: grass count (100K), bamboo count (25), shadow map (1024px), pixel ratio cap (1.5 vs 2)
- Bamboo wind is CPU-side but only 50 objects
- Loader shows weighted progress: Po 80%, bamboo 15%, dumpling 5%

### Loading Screen
CSS-only animated panda face with bouncing animation, pupil look animation, progress bar, and rotating subtitle messages:
1. "Preparing dumplings..."
2. "Warming up chopsticks..."
3. "Finding inner peace..."
4. "Mastering kung fu..."
5. "Skadooshing..."

## How to Run

```bash
# Any static file server works — no build step
npx serve .
# or
python3 -m http.server 8080
```

Open in browser. ES module import map requires a server (no `file://`).

## Key Constraints

- `script.js` references DOM elements that don't exist in `index.html` — not loaded, will throw if loaded
- Three.js version pinned at 0.167 — don't change without testing bone rig compatibility
- Bone names have numeric suffixes (e.g., `spine_02_01_6`, `head_038_44`) — renaming in Blender breaks tracking
- Chopstick detach/reattach depends on parent hierarchy in the dumpling GLB (`Object_2` = sticks, `Object_6` = bun)
- Go3v2 font must be preloaded before chat bubbles render correctly
- Music synth uses Web Audio API — requires user interaction to start (autoplay policy)
- Model coordinate system: Y is up, Z is forward (face at +Z), no pivot rotation needed
