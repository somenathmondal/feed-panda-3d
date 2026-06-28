import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const loader = new GLTFLoader();

// ── Loader UI ──
const loaderOverlay = document.getElementById('loaderOverlay');
const yinyangWrapper = document.getElementById('yinyangWrapper');
const loaderText = document.getElementById('loaderText');
const loaderSubtitle = document.querySelector('.loader-subtitle');

const loadProgress = { po: 0, dumpling: 0, bamboo: 0, grass: 0 };
const subtitles = [
  'Preparing dumplings...',
  'Warming up chopsticks...',
  'Finding inner peace...',
  'Mastering kung fu...',
  'Skadooshing...',
];

let targetProgress = 0;
let visualProgress = 0;
let lastLoaderTime = 0;
let loaderHidden = false;

function updateLoader() {
  const total = loadProgress.po * 0.75 + loadProgress.bamboo * 0.15 + loadProgress.dumpling * 0.05 + loadProgress.grass * 0.05;
  targetProgress = Math.min(Math.round(total * 100), 100);
}

function hideLoaderOverlay() {
  if (loaderHidden) return;
  loaderHidden = true;
  
  console.log('Loader complete! Hiding overlay.');
  loaderOverlay.classList.add('hidden');
  
  // Show music button and fade it in
  if (typeof musicBtn !== 'undefined') {
    musicBtn.style.display = 'flex';
    setTimeout(() => {
      musicBtn.style.opacity = '0.7';
    }, 50);
  }
  
  // Show hint toast after loader fades
  setTimeout(() => {
    if (isTouchDevice) {
      showToast('Drag the dumpling to Po\'s mouth and hold it there!', 5000);
    } else {
      showToast('Move your mouse to feed Po the dumpling', 5000);
    }
  }, 600);
  
  // "Feed me" bubble after 2s
  setTimeout(() => showChatBubble('Feed me!'), 2000);
  
  // Start music on first user interaction
  const startMusic = () => {
    if (!oogwayMusic.playing) {
      oogwayMusic.start();
      musicBtn.innerHTML = '♪';
      musicBtn.title = 'Mute';
      musicBtn.style.borderColor = 'rgba(255,255,255,0.6)';
    }
    document.removeEventListener('click', startMusic);
    document.removeEventListener('touchstart', startMusic);
  };
  document.addEventListener('click', startMusic, { once: true });
  document.addEventListener('touchstart', startMusic, { once: true });
}

function tickLoader(timestamp) {
  if (visualProgress >= 100) {
    if (modelsLoaded >= 4) {
      hideLoaderOverlay();
      return;
    }
  }

  if (!lastLoaderTime) lastLoaderTime = timestamp;
  const delta = (timestamp - lastLoaderTime) / 1000;
  lastLoaderTime = timestamp;

  // Reaches 100% in exactly 1.8s (100 / 1.8 = 55.56)
  const maxStep = 55.56 * delta;

  if (visualProgress < targetProgress) {
    visualProgress = Math.min(visualProgress + maxStep, targetProgress);
  }

  const displayPct = Math.min(Math.round(visualProgress), 100);

  if (yinyangWrapper) {
    yinyangWrapper.style.setProperty('--progress', displayPct + '%');
    yinyangWrapper.style.setProperty('--progress-num', displayPct);
    
    const yinyangSymbol = document.getElementById('yinyangSymbol');
    if (yinyangSymbol) {
      const speed = 3.5 - ((displayPct / 100) * 2.9);
      yinyangSymbol.style.setProperty('--spin-speed', speed + 's');
    }
  }

  if (loaderText) {
    loaderText.textContent = `Loading... ${displayPct}%`;
  }

  if (loaderSubtitle) {
    if (displayPct > 20 && displayPct <= 40) loaderSubtitle.textContent = subtitles[1];
    else if (displayPct > 40 && displayPct <= 60) loaderSubtitle.textContent = subtitles[2];
    else if (displayPct > 60 && displayPct <= 80) loaderSubtitle.textContent = subtitles[3];
    else if (displayPct > 80) loaderSubtitle.textContent = subtitles[4];
  }

  if (displayPct < 100 || modelsLoaded < 4) {
    requestAnimationFrame(tickLoader);
  } else {
    hideLoaderOverlay();
  }
}

// Start smooth visual loading loop
requestAnimationFrame((t) => {
  lastLoaderTime = t;
  requestAnimationFrame(tickLoader);
});

const toast = document.getElementById('toast');
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

function showToast(msg, duration = 4000) {
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}

// ── 3D Chat Bubble (canvas texture → sprite) ──
let chatSprite = null;
let chatAnim = { active: false, timer: 0, duration: 3.0, fadeIn: 0.4, fadeOut: 0.4, baseY: 1.75 };

function createChatTexture(msg) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSize = 36;
  const padding = 22;
  const tailH = 16;
  const fontFamily = "'Go3v2', Inter, sans-serif";

  ctx.font = `${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(msg);
  const textW = metrics.width;
  const w = textW + padding * 2;
  const h = fontSize + padding * 2 + tailH;
  canvas.width = w;
  canvas.height = h;

  // Bubble body
  const bodyH = h - tailH;
  const r = 24;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, bodyH - r);
  ctx.quadraticCurveTo(w, bodyH, w - r, bodyH);
  // Tail — pointing bottom-left toward Po
  ctx.lineTo(w * 0.35, bodyH);
  ctx.lineTo(w * 0.2, bodyH + tailH);
  ctx.lineTo(w * 0.25, bodyH);
  ctx.lineTo(r, bodyH);
  ctx.quadraticCurveTo(0, bodyH, 0, bodyH - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Text
  ctx.fillStyle = '#1a1a2e';
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, padding, bodyH / 2);

  return canvas;
}

// Preload Go3v2 so canvas can use it
document.fonts.load("36px 'Go3v2'").catch(() => {});

function showChatBubble(msg) {
  if (chatSprite) {
    scene.remove(chatSprite);
    chatSprite.material.map.dispose();
    chatSprite.material.dispose();
  }

  const canvas = createChatTexture(msg);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthTest: false });
  chatSprite = new THREE.Sprite(mat);

  // Size: keep aspect ratio, small bubble
  const aspect = canvas.width / canvas.height;
  const spriteH = 0.22;
  chatSprite.scale.set(spriteH * aspect, spriteH, 1);

  // Position to the right of Po's head (Desktop) or above head (Mobile/Portrait)
  const isPortrait = window.innerWidth < window.innerHeight;
  if (isTouchDevice || isPortrait) {
    chatAnim.baseY = 1.95;
    chatSprite.position.set(0, chatAnim.baseY, 1.0);
  } else {
    chatAnim.baseY = 1.75;
    chatSprite.position.set(0.6, chatAnim.baseY, 1.0);
  }
  chatSprite.renderOrder = 999;
  scene.add(chatSprite);

  chatAnim.active = true;
  chatAnim.timer = 0;
}

// ── 3D Interactive Tiles (Credits) ──
const clickableTiles = [];


let modelsLoaded = 0;
function onModelLoaded() {
  modelsLoaded++;
  if (modelsLoaded >= 4) {
    loadProgress.po = 1;
    loadProgress.dumpling = 1;
    loadProgress.bamboo = 1;
    loadProgress.grass = 1;
    updateLoader();
  }
}

// ── Config ──
const BONE_NAMES = {
  spine:      'spine_02_01_6',
  neck:       'neck_01_037_43',
  head:       'head_038_44',
  eyeL:       'cc_eye_l_041_47',
  eyeR:       'cc_eye_r_039_45',
  jaw:        'cc_jaw_043_49',
  armL:       'upperarm_l_048_54',
  armR:       'upperarm_r_076_82',
  forearmL:   'lowerarm_l_050_56',
  forearmR:   'lowerarm_r_079_85',
  handL:      'hand_l_052_58',
  handR:      'hand_r_081_87',
  clavicleL:  'clavicle_l_047_53',
  clavicleR:  'clavicle_r_075_81',
};

const DAMPING = {
  eye:   0.15,   // fastest — eyes snap to cursor
  head:  0.06,   // medium
  spine: 0.02,   // very slow — subtle body sway only
};

const LIMITS = {
  eyeX:   0.5,   // radians — exaggerated eye movement
  eyeY:   0.3,   // reduced so eyes don't disappear looking down
  headX:  0.4,   // ±23° head turn
  headY:  0.45,  // ±26° head tilt — more range for looking down
  spineX: 0.08,  // ±5° very subtle body lean
  spineY: 0.08,  // slight forward lean when looking down
};

// ── State ──
const mouse = { x: 0, y: 0 };
const current = {
  eyeX: 0, eyeY: 0,
  headX: 0, headY: 0,
  spineX: 0, spineY: 0,
};
const target = {
  eyeX: 0, eyeY: 0,
  headX: 0, headY: 0,
  spineX: 0, spineY: 0,
};

let mode = 'tracking'; // 'tracking' | 'email' | 'password' | 'peek'
let breathPhase = 0;

// ── Setup renderer ──
const canvas = document.getElementById('threeCanvas');
const panel = document.getElementById('scenePanel');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });

// ── Screenshot Helper ──
window.savePandaImage = () => {
  const link = document.createElement('a');
  link.download = 'preview.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
};
const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
// ── Performance config (tunable live in the #debug panel) ──
const perfCfg = { renderScale: isMobileDevice ? 1.25 : 1.5, shadowHz: 60 };
let _shadowAccum = 1e9;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, perfCfg.renderScale));
renderer.shadowMap.enabled = true;
renderer.shadowMap.autoUpdate = false;   // throttled manually — the sun moves slowly
renderer.shadowMap.needsUpdate = true;
renderer.shadowMap.type = isMobileDevice ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;

// ── Camera ──
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const baseCameraPos = new THREE.Vector3(0, 1.4, 4.5);
const baseCameraLookAt = new THREE.Vector3(0, 1.0, 0);
const cameraTargetPos = new THREE.Vector3().copy(baseCameraPos);
const cameraTargetLookAt = new THREE.Vector3().copy(baseCameraLookAt);
camera.position.copy(baseCameraPos);
camera.lookAt(baseCameraLookAt);

function resize() {
  const w = panel.clientWidth;
  const h = panel.clientHeight;
  renderer.setSize(w, h);
  if (composer) {
    composer.setSize(w, h);
  }
  if (typeof ensureVolumetricRTs === 'function') ensureVolumetricRTs(w, h);
  camera.aspect = w / h;

  const isMobile = w < 768;

  // Reposition tiles based on screen width
  if (clickableTiles.length >= 2) {
    const tile1 = clickableTiles[0];
    const tile2 = clickableTiles[1];
    
    if (isMobile) {
      // Stack vertically in a middle ground position
      tile1.position.set(0, 0.15, 1.8);
      tile2.position.set(0, 0.15, 2.3);
      tile1.userData.baseY = 0.15;
      tile2.userData.baseY = 0.15;
    } else {
      // Spread horizontally near feet
      tile1.position.set(-0.9, 0.15, 0.8);
      tile2.position.set(0.9, 0.15, 0.8);
      tile1.userData.baseY = 0.15;
      tile2.userData.baseY = 0.15;
    }
  }

  // Portrait (mobile): widen FOV and pull back so Po + sky + bamboo are visible
  if (w < h) {
    camera.fov = 48;
    baseCameraPos.set(0, 1.5, 5.5);
    baseCameraLookAt.set(0, 1.1, 0);
  } else {
    camera.fov = 32;
    baseCameraPos.set(0, 1.4, 4.5);
    baseCameraLookAt.set(0, 1.0, 0);
  }

  // Update targets if not currently animating (this prevents jumps, but allows settle)
  if (eat.state === 'tracking' || eat.state === 'respawn') {
    cameraTargetPos.copy(baseCameraPos);
    cameraTargetLookAt.copy(baseCameraLookAt);
  }

  camera.updateProjectionMatrix();
}

// ── Scene ──
const scene = new THREE.Scene();

// ── Postprocessing (Depth of Field) ──
let composer = null;
let bokehPass = null;

composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

bokehPass = new BokehPass(scene, camera, {
  focus: 4.5,
  aperture: 0.003, // much wider focus range to keep Po perfectly sharp
  maxblur: 0.0045, // subtle background blur that doesn't smear details
});
composer.addPass(bokehPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// ── Sky background & Environment map (Sunset Hybrid) ──
const skyNoiseMap = new THREE.TextureLoader().load('assets/perlin.webp');
skyNoiseMap.wrapS = THREE.RepeatWrapping;
skyNoiseMap.wrapT = THREE.RepeatWrapping;

const skyGeo = new THREE.SphereGeometry(50, 32, 32);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    uTime:        { value: 0 },
    uNoiseMap:    { value: skyNoiseMap },
    uTopColor:    { value: new THREE.Color('#384275') }, // dusk blue
    uMiddleColor: { value: new THREE.Color('#c96b79') }, // dusk pink
    uBottomColor: { value: new THREE.Color('#f0af78') }, // golden horizon
    uSunColor:    { value: new THREE.Color('#fff0d0') }, // warm sun
    uSunDir:      { value: new THREE.Vector3(3.0, 5.0, 4.0).normalize() },
    uCloudColor:  { value: new THREE.Color('#fffaee') }, // warm cloud cream
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 uTopColor;
    uniform vec3 uMiddleColor;
    uniform vec3 uBottomColor;
    uniform vec3 uSunColor;
    uniform vec3 uSunDir;
    uniform vec3 uCloudColor;
    uniform sampler2D uNoiseMap;
    uniform float uTime;
    varying vec3 vWorldPos;

    void main() {
      vec3 dir = normalize(vWorldPos - cameraPosition);
      float y = dir.y;

      // Gradient sky
      vec3 col;
      if (y < 0.0) {
        col = uBottomColor;
      } else if (y < 0.3) {
        col = mix(uBottomColor, uMiddleColor, y / 0.3);
      } else {
        col = mix(uMiddleColor, uTopColor, (y - 0.3) / 0.7);
      }

      // Sun glow
      float sunDot = max(dot(dir, uSunDir), 0.0);
      col += uSunColor * pow(sunDot, 32.0) * 0.4;
      col += uSunColor * pow(sunDot, 4.0) * 0.15;

      // Procedural drifting clouds
      if (y > -0.05) {
        // Cylindrical mapping: maps longitude to U and latitude to V
        // This keeps the clouds flat and horizontal, preventing arched wave/ripple bowing.
        float angle = atan(dir.z, dir.x);
        float u = (angle + 3.14159) / 6.28318 * 5.0; // wrap 5 times around the sky seamlessly
        float v = 1.0 / (max(dir.y, 0.0) + 0.12) * 0.22; // perspective compression near horizon
        vec2 cloudUV = vec2(u, v);
        
        // Mainly horizontal drift for natural wind motion
        vec2 drift = vec2(0.03, 0.003) * uTime;
        
        // Domain warping to create fluffy, wind-swept cartoon shapes
        vec2 warpUV = cloudUV * 0.45 + drift * 0.3;
        float warp = texture2D(uNoiseMap, warpUV).r;
        
        vec2 uv = cloudUV + drift + vec2(warp * 0.22, warp * 0.14);

        // FBM (Fractal Brownian Motion) approximation with 3 octaves
        float n1 = texture2D(uNoiseMap, uv).r;
        float n2 = texture2D(uNoiseMap, uv * 2.8 - drift * 0.4).r;
        float n3 = texture2D(uNoiseMap, uv * 6.5 + drift * 0.2).r;
        float noise = n1 * 0.52 + n2 * 0.32 + n3 * 0.16;

        // Clean-cut, stylized Ghibli edges using smoothstep
        float density = 0.47;
        float cloudMask = smoothstep(density, density + 0.12, noise);

        // Soft fade near the horizon to blend with the warm sunset haze
        cloudMask *= smoothstep(-0.05, 0.22, y);

        if (cloudMask > 0.0) {
          // Shading: sample noise offset towards the sun in cylindrical coordinates
          float sunAngle = atan(uSunDir.z, uSunDir.x);
          float shiftU = sin(sunAngle - angle) * 0.035;
          vec2 offsetUV = uv + vec2(shiftU, -0.01);
          
          float n1_offset = texture2D(uNoiseMap, offsetUV).r;
          float n2_offset = texture2D(uNoiseMap, offsetUV * 2.8 - drift * 0.4).r;
          float n3_offset = texture2D(uNoiseMap, offsetUV * 6.5 + drift * 0.2).r;
          float noiseOffset = n1_offset * 0.52 + n2_offset * 0.32 + n3_offset * 0.16;

          // Volumetric light factor based on density slope
          float lightFactor = smoothstep(-0.04, 0.08, noise - noiseOffset);

          // Stylized palette: cool deep dusk mauve-purple for cloud shadows, warm cream/pink for lit areas
          vec3 cloudShadow = mix(uMiddleColor * 0.55, vec3(0.32, 0.28, 0.42), 0.45);
          vec3 cloudBody = mix(cloudShadow, uCloudColor, lightFactor);

          // Bright warm rim highlight on the edge facing the sun
          float rimFactor = smoothstep(0.0, 0.06, noise - noiseOffset) * (1.0 - smoothstep(density + 0.01, density + 0.12, noise));
          vec3 cloudCol = mix(cloudBody, uSunColor * 1.25, rimFactor * 0.65);

          col = mix(col, cloudCol, cloudMask * 0.9);
        }
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `
});
const skyMesh = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyMesh);
window._skyMaterial = skyMat;

// Load static sunset texture purely to bake environment map reflections
new THREE.TextureLoader().load('assets/sky_88_2k.png', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRT = pmremGenerator.fromEquirectangular(texture);
  scene.environment = envRT.texture;
  pmremGenerator.dispose();
});

// ── Lights ──
const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff1cf, 2.2);
dirLight.position.set(3, 5, 4);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(isMobileDevice ? 1024 : 2048, isMobileDevice ? 1024 : 2048);
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 15;
dirLight.shadow.camera.left = -3;
dirLight.shadow.camera.right = 3;
dirLight.shadow.camera.top = 4;
dirLight.shadow.camera.bottom = -1;
dirLight.shadow.radius = 4;          // soft shadow blur
dirLight.shadow.blurSamples = 8;     // smooth penumbra
dirLight.shadow.bias = -0.0003;
dirLight.shadow.normalBias = 0.03;   // cure self-shadow acne on curved faces as the sun moves to grazing angles
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x88bbee, 0.5);
fillLight.position.set(-2, 1, 2);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffeedd, 0.4);
rimLight.position.set(0, 2, -3);
scene.add(rimLight);

// ═══════════════════════════════════════════════════════════════════════════
//  TIME-OF-DAY  +  VOLUMETRIC CLOUDS
//  A single `timeOfDay` (0→1 = midnight→midnight) drives the sky palette,
//  cloud coverage, sun/moon, and the whole scene's lighting. Clouds are
//  raymarched into a LOW-RES render target once per frame and blitted onto the
//  existing dome — so the expensive shader never runs at full resolution.
// ═══════════════════════════════════════════════════════════════════════════

const todState = { t: 0.34, auto: true, cycleSeconds: 120 };
// Deep-link a fixed time for testing/sharing, e.g. ?t=0.0 (midnight), ?t=0.76 (dusk)
const _todParams = new URLSearchParams(location.search);
if (_todParams.has('t')) {
  const _pt = parseFloat(_todParams.get('t'));
  if (!Number.isNaN(_pt)) { todState.t = ((_pt % 1) + 1) % 1; todState.auto = false; }
}
window.skyDebug = todState;

// ── Keyframes (authored in sRGB hex; ColorManagement converts to linear) ──
const KF = [
  { t: 0.00, top:'#070b16', mid:'#0c1326', horizon:'#1a2138', cloudLit:'#7c89ad', cloudShadow:'#222a40', sun:'#cfe0ff', moon:'#e6ecff', coverage:0.55, density:1.4, dir:'#9fb2e0', dirInt:0.50, amb:'#161d33', ambInt:0.34, fillInt:0.25, rimInt:0.20, exposure:1.05 },
  { t: 0.20, top:'#27345f', mid:'#7a5a7a', horizon:'#caa05f', cloudLit:'#ffcaa0', cloudShadow:'#4a3a52', sun:'#ffd9a0', moon:'#e6ecff', coverage:0.55, density:1.5, dir:'#ffb27a', dirInt:1.00, amb:'#3a3346', ambInt:0.40, fillInt:0.40, rimInt:0.50, exposure:1.00 },
  { t: 0.26, top:'#3a5aa0', mid:'#e89070', horizon:'#ff9e54', cloudLit:'#ffe0c0', cloudShadow:'#7a5560', sun:'#ffdca8', moon:'#e6ecff', coverage:0.50, density:1.5, dir:'#ffb878', dirInt:1.70, amb:'#5a4a52', ambInt:0.46, fillInt:0.50, rimInt:0.70, exposure:1.00 },
  { t: 0.35, top:'#2f6fcf', mid:'#7fb0ea', horizon:'#dce9ff', cloudLit:'#ffffff', cloudShadow:'#6f86ad', sun:'#fff4e0', moon:'#e6ecff', coverage:0.45, density:1.5, dir:'#fff0d8', dirInt:2.10, amb:'#9fb6d8', ambInt:0.50, fillInt:0.50, rimInt:0.40, exposure:1.00 },
  { t: 0.50, top:'#1f6fe0', mid:'#5fa3ee', horizon:'#cfe3ff', cloudLit:'#ffffff', cloudShadow:'#90a8c8', sun:'#ffffff', moon:'#e6ecff', coverage:0.33, density:1.4, dir:'#fffaf0', dirInt:2.50, amb:'#bcd2ee', ambInt:0.55, fillInt:0.50, rimInt:0.40, exposure:1.00 },
  { t: 0.66, top:'#2a6cc8', mid:'#7fb0e0', horizon:'#ffe6c0', cloudLit:'#fffaf0', cloudShadow:'#8a96b8', sun:'#fff0d0', moon:'#e6ecff', coverage:0.45, density:1.5, dir:'#fff0d8', dirInt:2.10, amb:'#b6c2d8', ambInt:0.50, fillInt:0.50, rimInt:0.45, exposure:1.00 },
  { t: 0.76, top:'#38406f', mid:'#d27a68', horizon:'#ff9148', cloudLit:'#ffd0a8', cloudShadow:'#6a4a58', sun:'#ffc89a', moon:'#e6ecff', coverage:0.60, density:1.6, dir:'#ff9a5a', dirInt:1.60, amb:'#4a3a48', ambInt:0.44, fillInt:0.45, rimInt:0.70, exposure:1.00 },
  { t: 0.84, top:'#1b2245', mid:'#5a4a78', horizon:'#a85f6a', cloudLit:'#9a8aae', cloudShadow:'#33304a', sun:'#cdd6f0', moon:'#e6ecff', coverage:0.58, density:1.5, dir:'#8a7ab0', dirInt:0.70, amb:'#20243c', ambInt:0.34, fillInt:0.30, rimInt:0.40, exposure:1.02 },
];
// precompute THREE.Color for color fields
const COLOR_KEYS = ['top','mid','horizon','cloudLit','cloudShadow','sun','moon','dir','amb'];
for (const k of KF) for (const c of COLOR_KEYS) k['_' + c] = new THREE.Color(k[c]);

// reusable output of a time-of-day sample (no per-frame allocations)
const tod = {
  coverage:0, density:0, dirInt:0, ambInt:0, fillInt:0, rimInt:0, exposure:1,
  sunDir: new THREE.Vector3(), moonDir: new THREE.Vector3(), dayFactor: 1,
};
for (const c of COLOR_KEYS) tod[c] = new THREE.Color();

const _sclrp = (a, b, f) => a + (b - a) * f;

function sampleTOD(t) {
  t = ((t % 1) + 1) % 1;
  // find bracketing keyframes (wrapping last→first)
  let a = KF[KF.length - 1], b = KF[0], span, f;
  if (t < KF[0].t) {
    a = KF[KF.length - 1]; b = KF[0];
    span = (1 - a.t) + b.t; f = (t + (1 - a.t)) / span;
  } else if (t >= KF[KF.length - 1].t) {
    a = KF[KF.length - 1]; b = KF[0];
    span = (1 - a.t) + b.t; f = (t - a.t) / span;
  } else {
    for (let i = 0; i < KF.length - 1; i++) {
      if (t >= KF[i].t && t < KF[i + 1].t) { a = KF[i]; b = KF[i + 1]; break; }
    }
    span = b.t - a.t; f = (t - a.t) / span;
  }
  f = f * f * (3 - 2 * f); // smoothstep easing between keyframes
  for (const c of COLOR_KEYS) tod[c].copy(a['_' + c]).lerp(b['_' + c], f);
  tod.coverage  = _sclrp(a.coverage,  b.coverage,  f);
  tod.density   = _sclrp(a.density,   b.density,   f);
  tod.dirInt    = _sclrp(a.dirInt,    b.dirInt,    f);
  tod.ambInt    = _sclrp(a.ambInt,    b.ambInt,    f);
  tod.fillInt   = _sclrp(a.fillInt,   b.fillInt,   f);
  tod.rimInt    = _sclrp(a.rimInt,    b.rimInt,    f);
  tod.exposure  = _sclrp(a.exposure,  b.exposure,  f);

  // celestial bodies: sun rises ~0.25, peaks at noon (0.5), sets ~0.75
  const phi = (t - 0.25) * Math.PI * 2.0;
  tod.sunDir.set(Math.cos(phi) * 0.7, Math.sin(phi), 0.45).normalize();
  tod.moonDir.copy(tod.sunDir).multiplyScalar(-1);
  tod.dayFactor = THREE.MathUtils.smoothstep(tod.sunDir.y, -0.06, 0.12);
  return tod;
}

// ── Sky dome: cheap 2D time-of-day clouds (no render target, ~120fps) ──
// Drifting FBM clouds sampled from the perlin noise texture on the BackSide dome.
// The whole palette / sun / moon / coverage is driven by the time-of-day system.
// This replaced an earlier volumetric raymarcher that was far too heavy for a
// near-static hero shot (couldn't hold 120fps even when throttled).
const domeMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    uTime:         { value: 0 },
    uNoiseMap:     { value: skyNoiseMap },
    uTopColor:     { value: new THREE.Color() },
    uMidColor:     { value: new THREE.Color() },
    uHorizonColor: { value: new THREE.Color() },
    uSunColor:     { value: new THREE.Color() },
    uMoonColor:    { value: new THREE.Color() },
    uCloudLit:     { value: new THREE.Color() },
    uCloudShadow:  { value: new THREE.Color() },
    uSunDir:       { value: new THREE.Vector3() },
    uMoonDir:      { value: new THREE.Vector3() },
    uDayFactor:    { value: 1 },
    uCoverage:     { value: 0.5 },
  },
  vertexShader: /* glsl */`
    varying vec3 vWorldPos;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uTopColor, uMidColor, uHorizonColor;
    uniform vec3 uSunColor, uMoonColor, uCloudLit, uCloudShadow;
    uniform vec3 uSunDir, uMoonDir;
    uniform float uTime, uDayFactor, uCoverage;
    uniform sampler2D uNoiseMap;
    varying vec3 vWorldPos;

    void main() {
      vec3 dir = normalize(vWorldPos - cameraPosition);
      float y = dir.y;

      // gradient sky
      vec3 col;
      if (y < 0.0) col = uHorizonColor;
      else if (y < 0.3) col = mix(uHorizonColor, uMidColor, y / 0.3);
      else col = mix(uMidColor, uTopColor, (y - 0.3) / 0.7);

      // sun glow (day) + moon disc (night)
      float sd = max(dot(dir, uSunDir), 0.0);
      col += uSunColor * pow(sd, 32.0) * 0.5  * uDayFactor;
      col += uSunColor * pow(sd, 4.0)  * 0.15 * uDayFactor;
      float md = max(dot(dir, uMoonDir), 0.0);
      col += uMoonColor * smoothstep(0.9988, 0.9994, md) * 1.6 * (1.0 - uDayFactor);
      col += uMoonColor * pow(md, 8.0) * 0.12 * (1.0 - uDayFactor);

      // drifting clouds (cylindrical mapping keeps them flat & horizontal)
      if (y > -0.05) {
        float angle = atan(dir.z, dir.x);
        float u = (angle + 3.14159) / 6.28318 * 5.0;
        float v = 1.0 / (max(dir.y, 0.0) + 0.12) * 0.22;
        vec2 cloudUV = vec2(u, v);
        vec2 drift = vec2(0.03, 0.003) * uTime;
        float warp = texture2D(uNoiseMap, cloudUV * 0.45 + drift * 0.3).r;
        vec2 uv = cloudUV + drift + vec2(warp * 0.22, warp * 0.14);

        float n1 = texture2D(uNoiseMap, uv).r;
        float n2 = texture2D(uNoiseMap, uv * 2.8 - drift * 0.4).r;
        float n3 = texture2D(uNoiseMap, uv * 6.5 + drift * 0.2).r;
        float noise = n1 * 0.52 + n2 * 0.32 + n3 * 0.16;

        // coverage drives the threshold: more coverage -> more cloud
        float density = mix(0.62, 0.30, uCoverage);
        float cloudMask = smoothstep(density, density + 0.12, noise);
        cloudMask *= smoothstep(-0.05, 0.22, y);

        if (cloudMask > 0.0) {
          // shade toward whichever body is up
          vec3 ldir = uDayFactor > 0.5 ? uSunDir : uMoonDir;
          float lAngle = atan(ldir.z, ldir.x);
          vec2 offsetUV = uv + vec2(sin(lAngle - angle) * 0.035, -0.01);
          float o1 = texture2D(uNoiseMap, offsetUV).r;
          float o2 = texture2D(uNoiseMap, offsetUV * 2.8 - drift * 0.4).r;
          float o3 = texture2D(uNoiseMap, offsetUV * 6.5 + drift * 0.2).r;
          float noiseOffset = o1 * 0.52 + o2 * 0.32 + o3 * 0.16;

          float lightFactor = smoothstep(-0.04, 0.08, noise - noiseOffset);
          vec3 body = mix(uCloudShadow, uCloudLit, lightFactor);
          float rim = smoothstep(0.0, 0.06, noise - noiseOffset) * (1.0 - smoothstep(density + 0.01, density + 0.12, noise));
          vec3 rimCol = mix(uMoonColor * 1.1, uSunColor * 1.25, uDayFactor);
          vec3 cloudCol = mix(body, rimCol, rim * 0.6);
          col = mix(col, cloudCol, cloudMask * 0.92);
        }
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
skyMesh.material = domeMat; // dome shows the cheap time-of-day clouds (default)

// ═══════════════════════════════════════════════════════════════════════════
//  AMORTIZED VOLUMETRIC CLOUDS (opt-in, #debug → Volumetric)
//  Real raymarched 3D clouds without blowing the 120fps budget, by exploiting
//  the near-static camera: each frame raymarches only 1/N of the rows of a
//  low-res ping-pong buffer (interleaved) and copies the rest from the previous
//  frame, blending new samples in (temporal EMA) so low step counts stay clean.
//  Per-frame cost is even (no spikes): a cheap fullscreen copy + 1/N raymarch.
// ═══════════════════════════════════════════════════════════════════════════
// Default ON for desktop (conservative steps/bands so weaker GPUs still hold up);
// mobile stays on the cheap 2D dome. Crank quality live in the #debug panel.
const vcfg = { enabled: !isMobileDevice, bands: 8, steps: 28, lightSteps: 4, blend: 0.6, scale: 0.5, maxSide: 1024 };
let vRTa = null, vRTb = null, vReadRT = null, vWriteRT = null;
let vFrame = 0, vPrime = true, _vLastW = 1, _vLastH = 1;
const vScene = new THREE.Scene();
const vCam = new THREE.Camera();
const _vInvVP = new THREE.Matrix4();

const vUpdateMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, toneMapped: false,
  uniforms: {
    uPrev:        { value: null },
    uActiveRow:   { value: 0 },
    uBands:       { value: vcfg.bands },
    uAllRows:     { value: 1 },
    uBlend:       { value: vcfg.blend },
    uCamPos:      { value: new THREE.Vector3() },
    uInvViewProj: { value: new THREE.Matrix4() },
    uTime:        { value: 0 },
    uBase:        { value: 55.0 },
    uTop:         { value: 150.0 },
    uScale:       { value: 1.2 },
    uWind:        { value: 1.0 },
    uAbsorption:  { value: 1.1 },
    uCoverage:    { value: 0.45 },
    uDensity:     { value: 1.5 },
    uLightDir:    { value: new THREE.Vector3() },
    uLightColor:  { value: new THREE.Color() },
    uAmbColor:    { value: new THREE.Color() },
    uSunDir:      { value: new THREE.Vector3() },
    uMoonDir:     { value: new THREE.Vector3() },
    uSunColor:    { value: new THREE.Color() },
    uMoonColor:   { value: new THREE.Color() },
    uDayFactor:   { value: 1 },
    uTopColor:    { value: new THREE.Color() },
    uMidColor:    { value: new THREE.Color() },
    uHorizonColor:{ value: new THREE.Color() },
    uSteps:       { value: vcfg.steps },
    uLightSteps:  { value: vcfg.lightSteps },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uPrev;
    uniform float uActiveRow, uBands, uAllRows, uBlend;
    uniform vec3 uCamPos; uniform mat4 uInvViewProj; uniform float uTime;
    uniform float uBase, uTop, uScale, uWind, uAbsorption, uCoverage, uDensity;
    uniform vec3 uLightDir, uLightColor, uAmbColor;
    uniform vec3 uSunDir, uMoonDir, uSunColor, uMoonColor; uniform float uDayFactor;
    uniform vec3 uTopColor, uMidColor, uHorizonColor;
    uniform int uSteps, uLightSteps;
    const float MAX_DIST = 1500.0;

    float hash(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
    float noise(vec3 x){
      vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                     mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                     mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
    const mat3 M = mat3(0.0,0.8,0.6,-0.8,0.36,-0.48,-0.6,-0.48,0.64);
    float fbm(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=M*p*2.02; a*=0.5; } return v; }
    float fbm3(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<3;i++){ v+=a*noise(p); p=M*p*2.02; a*=0.5; } return v; }
    float densityAt(vec3 p, bool cheap){
      float h=(p.y-uBase)/max(uTop-uBase,1e-3);
      float fall=smoothstep(0.0,0.25,h)*smoothstep(1.0,0.6,h);
      if(fall<=0.0) return 0.0;
      vec3 q=p*(0.01*uScale)+vec3(uTime*uWind*0.02,0.0,uTime*uWind*0.008);
      float d;
      if(cheap){ d=fbm3(q)-(1.0-uCoverage); }
      else { d=fbm(q)-(1.0-uCoverage); d=max(d,0.0); d-=0.18*fbm(q*3.0+1.7); }
      d=max(d,0.0)*fall;
      return clamp(d*uDensity,0.0,1.0);
    }
    float lightMarch(vec3 p){
      float stepLen=(uTop-uBase)/float(uLightSteps); float sum=0.0;
      for(int i=0;i<16;i++){ if(i>=uLightSteps) break; p+=uLightDir*stepLen; sum+=densityAt(p,true); }
      return exp(-sum*stepLen*uAbsorption);
    }
    vec3 skyColor(vec3 rd){
      float t=clamp(rd.y,-0.1,1.0); vec3 col;
      if(t<0.0) col=uHorizonColor;
      else if(t<0.25) col=mix(uHorizonColor,uMidColor,t/0.25);
      else col=mix(uMidColor,uTopColor,(t-0.25)/0.75);
      float sd=max(dot(rd,uSunDir),0.0);
      col+=uSunColor*pow(sd,350.0)*1.6*uDayFactor;
      col+=uSunColor*pow(sd,8.0)*0.14*uDayFactor;
      float md=max(dot(rd,uMoonDir),0.0);
      col+=uMoonColor*smoothstep(0.9988,0.9994,md)*2.0*(1.0-uDayFactor);
      col+=uMoonColor*pow(md,28.0)*0.16*(1.0-uDayFactor);
      return col;
    }
    void main(){
      vec4 prev = texture2D(uPrev, vUv);
      float row = floor(gl_FragCoord.y);
      bool doRay = (uAllRows > 0.5) || (abs(mod(row, uBands) - uActiveRow) < 0.5);
      if(!doRay){ gl_FragColor = prev; return; }

      vec4 clip=vec4(vUv*2.0-1.0,1.0,1.0);
      vec4 wp=uInvViewProj*clip; wp/=wp.w;
      vec3 ro=uCamPos, rd=normalize(wp.xyz-uCamPos);
      vec3 sky=skyColor(rd);
      vec3 c;
      float tEnter, tExit;
      if(abs(rd.y)<1e-4){
        if(ro.y>uBase&&ro.y<uTop){ tEnter=0.0; tExit=MAX_DIST; } else { tEnter=1.0; tExit=0.0; }
      } else {
        float t0=(uBase-ro.y)/rd.y, t1=(uTop-ro.y)/rd.y;
        tEnter=max(min(t0,t1),0.0); tExit=min(max(t0,t1),MAX_DIST);
      }
      if(tExit<=tEnter){ c=sky; }
      else {
        float stepSize=(tExit-tEnter)/float(uSteps);
        float t=tEnter+hash(vec3(gl_FragCoord.xy,uTime))*stepSize;
        vec3 scatter=vec3(0.0); float transmittance=1.0;
        for(int i=0;i<64;i++){
          if(i>=uSteps||t>tExit||transmittance<0.01) break;
          vec3 p=ro+rd*t;
          float dens=densityAt(p,false);
          if(dens>0.0){
            float light=lightMarch(p);
            vec3 sc=mix(uAmbColor,uLightColor,light);
            float al=1.0-exp(-dens*stepSize*uAbsorption);
            scatter+=transmittance*al*sc; transmittance*=1.0-al;
          }
          t+=stepSize;
        }
        c=sky*transmittance+scatter;
      }
      vec3 outc = (uAllRows>0.5 || prev.a<0.5) ? c : mix(prev.rgb, c, uBlend);
      gl_FragColor = vec4(outc, 1.0);
    }
  `,
});
vScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), vUpdateMat));

// dome material that blits the accumulated cloud buffer (screen-space UV + 9-tap blur)
const vBlitMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { uTex: { value: null }, uTexel: { value: new THREE.Vector2(1/1024, 1/1024) } },
  vertexShader: /* glsl */`
    varying vec4 vClip;
    void main() { vClip = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = vClip; }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D uTex; uniform vec2 uTexel; varying vec4 vClip;
    void main() {
      vec2 uv = (vClip.xy / vClip.w) * 0.5 + 0.5;
      vec3 c =
        texture2D(uTex, uv).rgb * 4.0 +
        texture2D(uTex, uv + vec2( uTexel.x, 0.0)).rgb * 2.0 +
        texture2D(uTex, uv + vec2(-uTexel.x, 0.0)).rgb * 2.0 +
        texture2D(uTex, uv + vec2(0.0,  uTexel.y)).rgb * 2.0 +
        texture2D(uTex, uv + vec2(0.0, -uTexel.y)).rgb * 2.0 +
        texture2D(uTex, uv + vec2( uTexel.x,  uTexel.y)).rgb +
        texture2D(uTex, uv + vec2( uTexel.x, -uTexel.y)).rgb +
        texture2D(uTex, uv + vec2(-uTexel.x,  uTexel.y)).rgb +
        texture2D(uTex, uv + vec2(-uTexel.x, -uTexel.y)).rgb;
      gl_FragColor = vec4(c / 16.0, 1.0);
    }
  `,
});

function ensureVolumetricRTs(w, h) {
  _vLastW = w; _vLastH = h;
  const dpr = renderer.getPixelRatio();
  let rw = w * dpr * vcfg.scale, rh = h * dpr * vcfg.scale;
  const longest = Math.max(rw, rh);
  if (longest > vcfg.maxSide) { const k = vcfg.maxSide / longest; rw *= k; rh *= k; }
  const fw = Math.max(1, Math.floor(rw)), fh = Math.max(1, Math.floor(rh));
  const opts = { type: THREE.HalfFloatType, depthBuffer: false, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter };
  if (!vRTa) {
    vRTa = new THREE.WebGLRenderTarget(fw, fh, opts);
    vRTb = new THREE.WebGLRenderTarget(fw, fh, opts);
    vReadRT = vRTa; vWriteRT = vRTb;
  } else {
    vRTa.setSize(fw, fh); vRTb.setSize(fw, fh);
  }
  vBlitMat.uniforms.uTexel.value.set(1 / fw, 1 / fh);
  vPrime = true; // repopulate the whole buffer after a size change
}

// render one amortized step into the cloud buffer (call before composer.render)
function updateVolumetricClouds() {
  if (!vWriteRT) ensureVolumetricRTs(_vLastW, _vLastH);
  const u = vUpdateMat.uniforms;
  u.uPrev.value = vReadRT.texture;
  u.uActiveRow.value = vFrame % vcfg.bands;
  u.uBands.value = vcfg.bands;
  u.uAllRows.value = vPrime ? 1 : 0;
  u.uBlend.value = vcfg.blend;
  u.uSteps.value = vcfg.steps;
  u.uLightSteps.value = vcfg.lightSteps;
  u.uTime.value = clock.elapsedTime;
  u.uCamPos.value.copy(camera.position);
  camera.updateMatrixWorld();
  _vInvVP.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).invert();
  u.uInvViewProj.value.copy(_vInvVP);

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(vWriteRT);
  renderer.render(vScene, vCam);
  renderer.setRenderTarget(prevTarget);

  const tmp = vReadRT; vReadRT = vWriteRT; vWriteRT = tmp; // ping-pong
  vBlitMat.uniforms.uTex.value = vReadRT.texture;
  vFrame++; vPrime = false;
}

function setCloudMode(volumetric) {
  vcfg.enabled = volumetric;
  if (volumetric && !vRTa) ensureVolumetricRTs(_vLastW, _vLastH);
  skyMesh.material = volumetric ? vBlitMat : domeMat;
  vPrime = true;
}
// apply the default mode at startup (desktop → volumetric, mobile → 2D dome)
setCloudMode(vcfg.enabled);

// ── Apply a sampled time-of-day to the sky dome + scene lighting ──
function applyTimeOfDay(t) {
  const s = sampleTOD(t);
  const u = domeMat.uniforms;
  u.uTime.value = clock.elapsedTime;
  u.uCoverage.value = s.coverage;
  u.uTopColor.value.copy(s.top);
  u.uMidColor.value.copy(s.mid);
  u.uHorizonColor.value.copy(s.horizon);
  u.uCloudLit.value.copy(s.cloudLit);
  u.uCloudShadow.value.copy(s.cloudShadow);
  u.uSunColor.value.copy(s.sun);
  u.uMoonColor.value.copy(s.moon);
  u.uSunDir.value.copy(s.sunDir);
  u.uMoonDir.value.copy(s.moonDir);
  u.uDayFactor.value = s.dayFactor;

  // scene lighting follows the sky; dominant light = whichever body is up
  const lightDir = s.sunDir.y > 0 ? s.sunDir : s.moonDir;

  // mirror into the volumetric material (only rendered when vcfg.enabled)
  const v = vUpdateMat.uniforms;
  v.uCoverage.value = s.coverage;
  v.uDensity.value  = s.density;
  v.uTopColor.value.copy(s.top);
  v.uMidColor.value.copy(s.mid);
  v.uHorizonColor.value.copy(s.horizon);
  v.uLightColor.value.copy(s.cloudLit);
  v.uAmbColor.value.copy(s.cloudShadow);
  v.uSunColor.value.copy(s.sun);
  v.uMoonColor.value.copy(s.moon);
  v.uSunDir.value.copy(s.sunDir);
  v.uMoonDir.value.copy(s.moonDir);
  v.uLightDir.value.copy(lightDir);
  v.uDayFactor.value = s.dayFactor;

  dirLight.color.copy(s.dir);
  dirLight.intensity = s.dirInt;
  dirLight.position.copy(lightDir).multiplyScalar(6);
  dirLight.position.y = Math.max(dirLight.position.y, 1.5);
  ambientLight.color.copy(s.amb);
  ambientLight.intensity = s.ambInt;
  fillLight.intensity = s.fillInt;
  rimLight.intensity  = s.rimInt;
  renderer.toneMappingExposure = s.exposure;
}

// ── Animated transition between times of day (preset buttons) ──
const todTween = { active: false, from: 0, to: 0, t0: 0, dur: 2.6 };
function gotoTimeOfDay(target) {
  todState.auto = false;                 // pin (stop the auto-cycle)
  let d = target - todState.t;
  d -= Math.round(d);                    // shortest path around the 0..1 cycle
  todTween.from = todState.t;
  todTween.to = todState.t + d;
  todTween.t0 = clock.elapsedTime;
  todTween.active = true;
}

// ── Analytics: track every click → Vercel Web Analytics + GA4 ──
function trackEvent(name, data) {
  try { if (window.va) window.va('event', { name, data }); } catch (e) {}
  try { if (window.gtag) window.gtag('event', name, data || {}); } catch (e) {}
}
// Capture-phase so it fires for every click regardless of per-element handlers.
// Label preference: data-track attr → element id → trimmed text → tag name.
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-track], a, button, [role="button"]');
  const label = el
    ? (el.dataset.track || el.id || (el.textContent || '').trim().slice(0, 40) || el.tagName.toLowerCase())
    : (e.target.id || e.target.tagName || 'page').toString().toLowerCase();
  trackEvent('ui_click', { target: label });
}, true);

// ── Time-of-day preset buttons (right side; animate seamlessly on click) ──
(function buildTimeOfDayPresets() {
  const style = document.createElement('style');
  style.textContent = `
    .tod-presets{position:fixed;right:20px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:10px;z-index:50}
    .tod-btn{font-family:'Go3v2','Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;letter-spacing:.5px;color:#fff;background:rgba(0,0,0,.45);border:1.5px solid rgba(255,255,255,.25);padding:9px 16px;border-radius:24px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;transition:all .3s cubic-bezier(.25,.8,.25,1);box-shadow:0 4px 15px rgba(0,0,0,.15);display:flex;align-items:center;gap:8px;min-width:104px}
    .tod-btn:hover{transform:translateX(-3px) scale(1.04);background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.6)}
    .tod-btn.active{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.85);box-shadow:0 6px 20px rgba(255,255,255,.12)}
    .tod-btn .ic{font-size:16px;line-height:1}
    @media (max-width:600px){.tod-presets{right:12px;gap:8px}.tod-btn{font-size:11px;padding:7px 11px;min-width:0}.tod-btn .lbl{display:none}}
  `;
  document.head.appendChild(style);

  const presets = [
    { label: 'Dawn',  icon: '🌅', t: 0.25 },
    { label: 'Day',   icon: '☀️', t: 0.50 },
    { label: 'Dusk',  icon: '🌆', t: 0.76 },
    { label: 'Night', icon: '🌙', t: 0.00 },
  ];
  const wrap = document.createElement('div');
  wrap.className = 'tod-presets';
  const btns = presets.map((p) => {
    const b = document.createElement('button');
    b.className = 'tod-btn';
    b.dataset.track = 'preset_' + p.label.toLowerCase(); // picked up by the global click tracker
    b.innerHTML = `<span class="ic">${p.icon}</span><span class="lbl">${p.label}</span>`;
    b.onclick = () => {
      gotoTimeOfDay(p.t);
      btns.forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    };
    wrap.appendChild(b);
    return b;
  });
  document.body.appendChild(wrap);

  // hide while the right-docked #debug panel is open (avoid overlap)
  const sync = () => { wrap.style.display = location.hash.toLowerCase().includes('debug') ? 'none' : 'flex'; };
  window.addEventListener('hashchange', sync);
  sync();
})();

// ── Debug panel (Tweakpane, docked right; gated behind #debug in the URL) ──
// Tweakpane is lazy-loaded from CDN ONLY when #debug is present, so the
// production page never fetches it. Add/remove #debug live (no reload needed).
let _pane = null, _paneBuilding = false;
const _fmtClock = (t) => { const m = Math.round(t * 24 * 60); return String(Math.floor(m / 60) % 24).padStart(2,'0') + ':' + String(m % 60).padStart(2,'0'); };

async function buildDebugPanel() {
  if (_pane || _paneBuilding) return;
  _paneBuilding = true;
  let Pane;
  try {
    ({ Pane } = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/+esm'));
  } catch (e) {
    console.error('[sky] failed to load Tweakpane', e);
    _paneBuilding = false;
    return;
  }

  _pane = new Pane({ title: 'Sky · Debug' });
  // dock to the right edge, vertically centered
  Object.assign(_pane.element.style, {
    position: 'fixed', top: '50%', right: '16px', left: 'auto',
    transform: 'translateY(-50%)', width: '260px', zIndex: '2147483647',
  });

  const fTod = _pane.addFolder({ title: 'Time of Day', expanded: true });
  fTod.addBinding(todState, 'auto', { label: 'auto cycle' });
  const tBinding = fTod.addBinding(todState, 't', { label: 'time', min: 0, max: 1, step: 0.001 });
  tBinding.on('change', () => { todState.auto = false; }); // manual scrub pauses auto
  const clockObj = { time: _fmtClock(todState.t) };
  const clockBinding = fTod.addBinding(clockObj, 'time', { readonly: true, label: 'clock' });

  if (bokehPass) {
    const fDof = _pane.addFolder({ title: 'Depth of Field', expanded: true });
    fDof.addBinding(bokehPass, 'enabled', { label: 'enabled' });
    fDof.addBinding(bokehPass.uniforms['maxblur'], 'value', { label: 'blur', min: 0, max: 0.02, step: 0.0005 });
  }

  const fPerf = _pane.addFolder({ title: 'Performance', expanded: true });
  fPerf.addBinding(perfCfg, 'renderScale', { label: 'render scale', min: 0.75, max: 2, step: 0.05 })
    .on('change', () => { renderer.setPixelRatio(Math.min(window.devicePixelRatio, perfCfg.renderScale)); resize(); });
  fPerf.addBinding(perfCfg, 'shadowHz', { label: 'shadow Hz', min: 1, max: 60, step: 1 });
  if (window._grassMesh) fPerf.addBinding(window._grassMesh, 'visible', { label: 'grass' });
  if (window._grassMaterial) {
    const grassState = { solid: !window._grassMaterial.transparent };
    fPerf.addBinding(grassState, 'solid', { label: 'grass solid' })
      .on('change', () => { window._grassMaterial.transparent = !grassState.solid; window._grassMaterial.needsUpdate = true; });
  }

  const fVol = _pane.addFolder({ title: 'Volumetric clouds (beta)', expanded: true });
  fVol.addBinding(vcfg, 'enabled', { label: '3D clouds' }).on('change', () => setCloudMode(vcfg.enabled));
  fVol.addBinding(vcfg, 'bands', { label: 'refresh bands', min: 1, max: 16, step: 1 }).on('change', () => { vPrime = true; });
  fVol.addBinding(vcfg, 'steps', { label: 'steps', min: 8, max: 48, step: 1 });
  fVol.addBinding(vcfg, 'lightSteps', { label: 'light steps', min: 2, max: 12, step: 1 });
  fVol.addBinding(vcfg, 'blend', { label: 'temporal', min: 0.1, max: 1, step: 0.05 });

  // keep the clock + (during auto-cycle) the time slider in sync with todState
  window.__skyScrubberSync = () => {
    clockObj.time = _fmtClock(todState.t);
    clockBinding.refresh();
    if (todState.auto) tBinding.refresh();
  };

  _pane.element.style.display = location.hash.toLowerCase().includes('debug') ? '' : 'none';
  _paneBuilding = false;
  console.log('[sky] Tweakpane debug panel mounted (right side)');
}

function syncDebugPanelVisibility() {
  const want = location.hash.toLowerCase().includes('debug');
  if (want) buildDebugPanel();
  if (_pane) _pane.element.style.display = want ? '' : 'none';
}
window.addEventListener('hashchange', syncDebugPanelVisibility);
syncDebugPanelVisibility();

// optional: start with DoF off via ?dof=off (or ?dof=0)
if (_todParams.has('dof') && bokehPass) {
  const v = _todParams.get('dof');
  bokehPass.enabled = !(v === 'off' || v === '0' || v === 'false');
}

// optional: start with the amortized 3D volumetric clouds via ?vol=1
if (_todParams.has('vol')) {
  const v = _todParams.get('vol');
  setCloudMode(!(v === '0' || v === 'off' || v === 'false'));
}

// ── Ground plane ──
const groundGeo = new THREE.PlaneGeometry(40, 40);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x8db87a,
  roughness: 0.95,
  metalness: 0.0,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// ── Procedural Ghibli Grass ──
{
  const noiseMap = new THREE.TextureLoader().load('assets/perlin.webp');
  noiseMap.wrapS = THREE.RepeatWrapping;
  noiseMap.wrapT = THREE.RepeatWrapping;

  loader.load('models/grass-blades-up.glb', (gltf) => {
    let grassGeo = null;
    gltf.scene.traverse((child) => {
      if (child.isMesh && !grassGeo) {
        grassGeo = child.geometry;
      }
    });

    if (!grassGeo) {
      console.error("Could not find geometry in grass GLB!");
      return;
    }

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const bladeHeight = size.y || 0.35;
    console.log('Grass blade model loaded — height:', bladeHeight);

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    const GRASS_COUNT = isMobile ? 22000 : 40000;
    const SPREAD = 40;
    const CLEAR_RADIUS = 0.6;

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,  // translucent Ghibli look; toggle 'grass solid' in #debug for opaque/perf
      opacity: 0.8,
    });

    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uNoiseMap = { value: noiseMap };
      shader.uniforms.uWindStrength = { value: 0.25 };
      shader.uniforms.uWindSpeed = { value: 2.0 };
      shader.uniforms.uWindAngle = { value: 45.0 };
      shader.uniforms.uGustScale = { value: 0.5 };
      shader.uniforms.uTurbulence = { value: 0.28 };
      shader.uniforms.uFlutter = { value: 0.28 };
      shader.uniforms.uHeightVariation = { value: 0.5 };
      shader.uniforms.uHeightNoiseScale = { value: 0.15 };
      shader.uniforms.uRootColor = { value: new THREE.Color('#6aa14f') };
      shader.uniforms.uTipColor = { value: new THREE.Color('#a1cc33') };
      shader.uniforms.uRootColorB = { value: new THREE.Color('#74a022') };
      shader.uniforms.uTipColorB = { value: new THREE.Color('#e8e84f') };
      shader.uniforms.uColorVariation = { value: 0.5 };
      shader.uniforms.uColorPatchScale = { value: 0.7 };
      shader.uniforms.uMacroVariation = { value: 0.48 };
      shader.uniforms.uMacroScale = { value: 0.115 };
      shader.uniforms.uBladeHeight = { value: bladeHeight };

      grassMat.userData.shader = shader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPosition;
         varying float vHeightAlongBlade;
         varying float vInstanceSeed;

         uniform float uTime;
         uniform sampler2D uNoiseMap;
         uniform float uWindStrength;
         uniform float uWindSpeed;
         uniform float uWindAngle;
         uniform float uGustScale;
         uniform float uTurbulence;
         uniform float uFlutter;
         uniform float uHeightVariation;
         uniform float uHeightNoiseScale;
         uniform float uBladeHeight;

         attribute vec2 aOrigin;
         attribute vec2 aFacing;

         float hash(float n) {
             return fract(sin(n) * 43758.5453123);
         }
         float hash(vec2 p) {
             return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
         }

         vec3 getWindSway(vec3 localPos, vec2 origin, vec2 facing, float timeVal, float index) {
             float height = uBladeHeight;
             float t = clamp(localPos.y / height, 0.0, 1.0);

             float bladeSeed = hash(index);
             float bladePhase = bladeSeed * 6.2831853;
             float ampVar = 0.65 + hash(index + 7.0) * 0.7;

             float baseAngle = uWindAngle * (3.14159265 / 180.0);
             float wobble = sin(timeVal * uWindSpeed * 0.6 + bladePhase) * uTurbulence * 0.4;
             float angle = baseAngle + wobble;
             vec2 windDir = vec2(cos(angle), sin(angle));
             vec2 perpDir = vec2(-windDir.y, windDir.x);

             float along = dot(origin, windDir);

             vec2 noiseUV = origin * 0.03;
             float noiseVal = texture2D(uNoiseMap, noiseUV).r;
             float noiseJitter = (noiseVal - 0.5) * 2.0;

             float gustPhase = along * uGustScale - timeVal * uWindSpeed * 0.6 + noiseJitter * 1.5;
             float gust = pow(sin(gustPhase) * 0.5 + 0.5, 1.6);

             float chopPhase = along * (uGustScale * 2.7) - timeVal * uWindSpeed * 1.3 + bladePhase;
             float chop = sin(chopPhase) * 0.5 + 0.5;

             float intensity = (0.25 + gust * 0.85 + chop * 0.18) * ampVar;

             float BEND_GAIN = 3.0;
             float phi = clamp(uWindStrength * intensity * BEND_GAIN, 0.0, 1.6);

             float bendExponent = 1.5;
             float shaped = pow(t, bendExponent);
             float a = phi * shaped;
             float safePhi = max(phi, 0.001);
             float R = height / safePhi;
             float u = R * (1.0 - cos(a));
             float dv = R * sin(a) - localPos.y;

             float flutterMask = smoothstep(0.55, 1.0, t);
             float flutterPhase = timeVal * 10.0 + bladeSeed * 3.0 + along * 0.8;
             float flutterAmt = sin(flutterPhase) * uFlutter * 0.08 * flutterMask;

             vec2 horiz = windDir * u + perpDir * flutterAmt;

             float cosY = facing.x;
             float sinY = facing.y;
             float localX = horiz.x * cosY - horiz.y * sinY;
             float localZ = horiz.x * sinY + horiz.y * cosY;

             return vec3(localX, dv, localZ);
         }
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float instanceIdx = float(gl_InstanceID);
         vec3 sway = getWindSway(position, aOrigin, aFacing, uTime, instanceIdx);

         float hNoise = hash(aOrigin + vec2(53.0, 17.0));
         float hFactor = clamp(1.0 + (hNoise - 0.5) * 2.0 * uHeightVariation, 0.2, 1.8);

         vec3 swayed = position + sway;
         transformed = vec3(swayed.x, swayed.y * hFactor, swayed.z);
         vInstanceSeed = hash(instanceIdx + 13.37);
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         #ifdef USE_INSTANCING
             vWorldPosition = ( instanceMatrix * vec4( swayed, 1.0 ) ).xyz;
             vWorldPosition.y *= hFactor;
             vWorldPosition = ( modelMatrix * vec4( vWorldPosition, 1.0 ) ).xyz;
         #else
             vWorldPosition = ( modelMatrix * vec4( swayed, 1.0 ) ).xyz;
             vWorldPosition.y *= hFactor;
         #endif
         vHeightAlongBlade = clamp(position.y / uBladeHeight, 0.0, 1.0);
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldPosition;
         varying float vHeightAlongBlade;
         varying float vInstanceSeed;

         uniform float uTime;
         uniform sampler2D uNoiseMap;
         uniform vec3 uRootColor;
         uniform vec3 uTipColor;
         uniform vec3 uRootColorB;
         uniform vec3 uTipColorB;
         uniform float uColorVariation;
         uniform float uColorPatchScale;
         uniform float uMacroVariation;
         uniform float uMacroScale;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
         vec3 skyNormalWorld = (vec4(normal, 0.0) * viewMatrix).xyz;
         skyNormalWorld = normalize(vec3(skyNormalWorld.x, abs(skyNormalWorld.y), skyNormalWorld.z));
         normal = normalize( ( viewMatrix * vec4(skyNormalWorld, 0.0) ).xyz );
         #ifdef DOUBLE_SIDED
             normal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
         #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float gradT = pow(vHeightAlongBlade, 1.4);
         vec3 gradientA = mix(uRootColor, uTipColor, gradT);
         vec3 gradientB = mix(uRootColorB, uTipColorB, gradT);

         vec2 patchUV = vWorldPosition.xz * uColorPatchScale * 0.25;
         float patchNoise = texture2D(uNoiseMap, patchUV).r;
         float patchBlend = clamp(patchNoise * uColorVariation, 0.0, 1.0);
         vec3 baseColor = mix(gradientA, gradientB, patchBlend);

         vec2 macroUV = (vWorldPosition.xz + vec2(137.0, 91.0)) * uMacroScale * 0.15;
         float macroNoise = texture2D(uNoiseMap, macroUV).r;
         float macroFactor = 1.0 + (macroNoise - 0.5) * 2.0 * uMacroVariation;

         float brightness = mix(0.85, 1.15, vInstanceSeed);
         vec3 finalColor = baseColor * macroFactor * brightness;
         diffuseColor = vec4( finalColor, opacity );
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         vec3 sunDir = vec3(0.4243, 0.7071, 0.5657); // World-space sun direction
         vec3 viewDir = normalize(cameraPosition - vWorldPosition);

         float transDistortion = 0.5;
         vec3 transLightDir = normalize(sunDir + skyNormalWorld * transDistortion);
         float backLight = pow(max(dot(viewDir, -transLightDir), 0.0), 3.0);
         float thicknessMask = pow(vHeightAlongBlade, 1.5);
         vec3 translucencyColor = vec3(207.0/255.0, 224.0/255.0, 106.0/255.0);
         vec3 translucency = translucencyColor * backLight * thicknessMask * 1.2;

         float fresnelVal = pow(1.0 - max(dot(skyNormalWorld, viewDir), 0.0), 4.0);
         vec3 fresnelColor = vec3(234.0/255.0, 242.0/255.0, 192.0/255.0);
         vec3 fresnelRim = fresnelColor * fresnelVal * 0.25;

         totalEmissiveRadiance += (translucency + fresnelRim);
        `
      );
    };

    const originArray = new Float32Array(GRASS_COUNT * 2);
    const facingArray = new Float32Array(GRASS_COUNT * 2);

    const dummy = new THREE.Object3D();

    let _seed = 12345;
    function seededRandom() {
      _seed = (_seed * 16807) % 2147483647;
      return (_seed - 1) / 2147483646;
    }

    const instancedGrass = new THREE.InstancedMesh(grassGeo, grassMat, GRASS_COUNT);
    instancedGrass.receiveShadow = true;

    let placed = 0;
    while (placed < GRASS_COUNT) {
      const x = (seededRandom() - 0.5) * SPREAD;
      const z = (seededRandom() - 0.5) * SPREAD;

      if (Math.sqrt(x * x + z * z) < CLEAR_RADIUS) continue;

      dummy.position.set(x, 0, z);

      const angleY = seededRandom() * Math.PI * 2;
      const bendX = (seededRandom() - 0.5) * 0.1;
      const bendZ = (seededRandom() - 0.5) * 0.1;
      dummy.rotation.set(bendX, angleY, bendZ);

      const scale = 0.22;
      const w = (0.8 + seededRandom() * 0.4) * scale;
      const h = (0.8 + seededRandom() * 0.5) * scale;
      dummy.scale.set(w, h, w);
      dummy.updateMatrix();
      instancedGrass.setMatrixAt(placed, dummy.matrix);

      originArray[placed * 2 + 0] = x;
      originArray[placed * 2 + 1] = z;
      facingArray[placed * 2 + 0] = Math.cos(angleY);
      facingArray[placed * 2 + 1] = Math.sin(angleY);

      placed++;
    }

    grassGeo.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(originArray, 2));
    grassGeo.setAttribute('aFacing', new THREE.InstancedBufferAttribute(facingArray, 2));

    window._grassMaterial = grassMat;
    window._grassMesh = instancedGrass;
    scene.add(instancedGrass);
    console.log('Procedural Ghibli Grass loaded successfully:', GRASS_COUNT, 'instances.');
    onModelLoaded();
  }, (progress) => {
    if (progress.total) loadProgress.grass = progress.loaded / progress.total;
    updateLoader();
  }, (err) => {
    console.error('Grass GLB load FAILED:', err);
  });
}

// Soft shadow blob under character
const shadowGeo = new THREE.PlaneGeometry(3, 3);
const shadowMat = new THREE.ShadowMaterial({ opacity: 0.15 });
const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = 0.01;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// ── Dumpling state ──
let dumpling = null;
let dumplingBody = null;    // Object_6 — the bun
let chopsticksMesh = null;  // Object_2 — the sticks
let chopsticksOrigParent = null;
const chopsticksOrigLocal = { pos: null, rot: null, scl: null };
const dumplingTarget = new THREE.Vector3();

// ── Eat state machine ──
// 'tracking' → 'anticipation' → 'eating' → 'chewing' → 'satisfied' → 'respawn' → 'tracking'
const eat = {
  state: 'tracking',
  timer: 0,
  proximityTimer: 0,     // how long dumpling has been near mouth
  chewCount: 0,
  chopstickVel: new THREE.Vector3(),
  chopstickAngVel: new THREE.Vector3(),
  originalDumplingScale: 1,
};

// ── Bones reference ──
const bones = {};

// ── Initial rotations (rest pose) ──
const restRotations = {};

// ── Face morphs (shape keys in po_expressive.glb: smile, happyEyes, smileBig, happyEyesBig) ──
let faceMesh = null;
const FACE_KEYS = { smile: 'smileBig', eyes: 'happyEyesBig' };

// ── Load model ──
loader.load('models/po_expressive.glb', (gltf) => {
  const model = gltf.scene;

  // Compute bounding box to understand model orientation
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  console.log('Model bounds — size:', size, 'center:', center);
  console.log('BBox min:', box.min, 'max:', box.max);

  // Raw bbox: X(-1.05..1.05)=2.1, Y(-0.38..0.37)=0.76, Z(-1.52..0)=1.52
  // X is wide (left-right), Z is tall (head-to-toe going negative), Y is thin (front-back)
  // He's lying on Y-plane, head pointing toward -Z, feet toward +Z=0
  // We need: head up (+Y), facing camera (+Z)

  const pivot = new THREE.Group();
  pivot.add(model);

  // Rotate: bring -Z (head) up to +Y, and Y (front) to face +Z (camera)
  // Raw bbox: X=2.1(wide), Y=0.76(thin=front-back), Z=1.52(tall=head-to-toe)
  // Z goes -1.52(head) to 0(feet). Y is depth. X is left-right.
  //
  // Strategy: don't rotate the model (breaks bone lookups).
  // Instead, rotate the PIVOT and adjust the camera.

  // Pivot rotation: bring Z-up to Y-up, face toward camera
  // Rotate pivot +90° around X: Z→Y (head goes up)
  // But head is at -Z, so after +90° X-rot: -Z → +Y ✓
  // Don't fight the coordinate system. Po's raw layout:
  //   X: -1.05 to 1.05 (left-right) ✓
  //   Y:  0.00 to 1.52  (head-to-toe, head at max Y) — this is "up" in his space
  //   Z: -0.38 to 0.37  (front-back)
  // So Y IS already up! The bbox center.y = 0.76 means he's standing from Y=0 to Y=1.52
  // Z front = +0.37 (face), Z back = -0.38
  // No rotation needed — just scale and position, and point camera at center

  const scaleFactor = 1.3;
  pivot.scale.setScalar(scaleFactor);

  pivot.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(pivot);
  const center2 = new THREE.Vector3();
  box2.getCenter(center2);
  console.log('Scaled — center:', center2, 'min:', box2.min, 'max:', box2.max);

  // Center horizontally, feet on ground
  pivot.position.x -= center2.x;
  pivot.position.y -= box2.min.y;  // feet at y=0

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.metalness = 0.0;
        child.material.roughness = 0.8;
      }
      if (child.morphTargetDictionary && child.morphTargetDictionary[FACE_KEYS.smile] !== undefined) {
        faceMesh = child;
      }
    }

    // Find bones by name
    if (child.isBone) {
      for (const [key, name] of Object.entries(BONE_NAMES)) {
        if (child.name === name) {
          bones[key] = child;
          restRotations[key] = child.rotation.clone();
        }
      }
    }
  });

  scene.add(pivot);

  console.log('Bones found:', Object.keys(bones).join(', '));
  console.log('Missing:', Object.keys(BONE_NAMES).filter(k => !bones[k]).join(', ') || 'none');
  console.log('Face morphs:', faceMesh ? Object.keys(faceMesh.morphTargetDictionary).join(', ') : 'none');

  // Console/debug handle (see debug.html) — inspect eat state and morph influences
  window.poDebug = { eat, getFace: () => faceMesh };

  resize();
  animate();
  onModelLoaded();
}, (progress) => {
  if (progress.total) loadProgress.po = progress.loaded / progress.total;
  updateLoader();
}, (err) => {
  console.error('Model load error:', err);
});

// ── Load dumpling ──
loader.load('models/dumpling.glb', (gltf) => {
  dumpling = gltf.scene;

  const box = new THREE.Box3().setFromObject(dumpling);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log('Dumpling raw size:', size);

  // Scale to ~0.4 units
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? 0.4 / maxDim : 1;
  dumpling.scale.setScalar(scale);

  dumpling.position.set(1, 1.4, 2.5);
  dumpling.castShadow = true;

  // Separate chopsticks vs dumpling body
  dumpling.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      if (c.name === 'Object_2') {
        chopsticksMesh = c;
        chopsticksOrigParent = c.parent;
        chopsticksOrigLocal.pos = c.position.clone();
        chopsticksOrigLocal.rot = c.rotation.clone();
        chopsticksOrigLocal.scl = c.scale.clone();
      }
      if (c.name === 'Object_6') dumplingBody = c;
    }
  });

  eat.originalDumplingScale = scale;
  scene.add(dumpling);
  console.log('Dumpling loaded, chopsticks:', !!chopsticksMesh, 'body:', !!dumplingBody);
  onModelLoaded();
}, (progress) => {
  if (progress.total) loadProgress.dumpling = progress.loaded / progress.total;
  updateLoader();
}, (err) => {
  console.error('Dumpling load FAILED:', err);
});

// ── Load bamboo ──
loader.load('models/bamboo.glb', (gltf) => {
  const bamboo = gltf.scene;

  // Measure and auto-scale to ~3 units tall
  const box = new THREE.Box3().setFromObject(bamboo);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log('Bamboo raw size:', size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const baseScale = 3 / maxDim;

  // Procedurally scatter bamboo — seeded RNG for deterministic placement
  let _seed = 42;
  function seededRandom() {
    _seed = (_seed * 16807 + 0) % 2147483647;
    return (_seed - 1) / 2147483646;
  }
  function rand(min, max) { return min + seededRandom() * (max - min); }

  const placements = [];
  const TOTAL = isMobileDevice ? 80 : 120;
  const CLEAR_RADIUS = 2.0; // keep Po visible

  for (let i = 0; i < TOTAL; i++) {
    let x, z, attempts = 0;
    do {
      // Widen the area: X (-12 to 12), Z (-15 to 1)
      x = rand(-12, 12);
      z = rand(-15, 1);
      attempts++;
    } while (Math.sqrt(x * x + z * z) < CLEAR_RADIUS && attempts < 30);

    // Farther back = slightly smaller but still visible
    const depth = Math.abs(z);
    const scale = rand(0.6, 1.2) * (1 - Math.min(depth * 0.04, 0.6));

    placements.push({
      x,
      z,
      scale: Math.max(scale, 0.4),
      rotY: rand(-Math.PI, Math.PI),
      scaleY: rand(0.85, 1.3), // height variation
    });
  }

  const bambooClones = [];

  placements.forEach((p, i) => {
    const clone = bamboo.clone();
    const s = baseScale * p.scale;
    clone.scale.set(s, s * (p.scaleY || 1), s);
    clone.position.set(p.x, 0, p.z);
    clone.rotation.y = p.rotY;
    clone.traverse((c) => {
      if (c.isMesh) {
        c.castShadow = true;
        c.receiveShadow = true;
        // Lighten bamboo — clone material so each instance can vary
        if (c.material) {
          c.material = c.material.clone();
          c.material.color.lerp(new THREE.Color(0xffffff), 0.35);
          c.material.roughness = Math.min(c.material.roughness + 0.1, 1.0);
        }
      }
    });
    // Store wind phase offset for each stalk
    clone.userData.windOffset = i * 0.7 + seededRandom() * 2;
    clone.userData.windStrength = 0.015 + seededRandom() * 0.01;
    bambooClones.push(clone);
    scene.add(clone);
  });

  // Wind animation — runs inside the main animate loop
  window._bambooClones = bambooClones;

  console.log('Bamboo loaded, placed', placements.length, 'stalks');
  onModelLoaded();
}, (progress) => {
  if (progress.total) loadProgress.bamboo = progress.loaded / progress.total;
  updateLoader();
}, (err) => {
  console.error('Bamboo load FAILED:', err);
});

// ── Lerp ──
function lerp(current, target, factor) {
  return current + (target - current) * factor;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ── Raycaster & Input ──
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const mouseWorld = new THREE.Vector3();

// Invisible plane at Z=2 for the cursor to "land" on
const cursorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1);

// Handle clicks on 3D tiles
document.addEventListener('click', (e) => {
  if (clickableTiles.length === 0) return;
  
  const rect = canvas.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);
  const intersects = raycaster.intersectObjects(clickableTiles);
  
  if (intersects.length > 0) {
    const url = intersects[0].object.userData.url;
    if (url) window.open(url, '_blank');
  }
});

document.addEventListener('mousemove', (e) => {
  // NDC relative to the canvas, not full viewport
  const rect = canvas.getBoundingClientRect();
  mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  // Also keep viewport-wide NDC for head/spine (wider range)
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;

  // Unproject mouse into 3D world point on the cursor plane
  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(cursorPlane, mouseWorld);

  // Hover effect for tiles
  let found = false;
  if (clickableTiles.length > 0) {
    const intersects = raycaster.intersectObjects(clickableTiles);
    clickableTiles.forEach(tile => {
      tile.userData.hover = false;
    });
    if (intersects.length > 0) {
      intersects[0].object.userData.hover = true;
      found = true;
    }
  }
  document.body.style.cursor = found ? 'pointer' : 'none';
});

// ── Touch support ──
let touchActive = false;

function handleTouchStart(e) {
  // We don't preventDefault here immediately so clicks can still fire if needed,
  // OR we handle the tile click manually right here.
  const touch = e.touches[0];
  if (!touch) return;
  touchActive = true;

  const rect = canvas.getBoundingClientRect();
  
  // 1. Check for tile clicks (NO offset - use exact touch point)
  const touchNDC = new THREE.Vector2();
  touchNDC.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  touchNDC.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(touchNDC, camera);
  const intersects = raycaster.intersectObjects(clickableTiles);
  if (intersects.length > 0) {
    const url = intersects[0].object.userData.url;
    if (url) {
      window.open(url, '_blank');
      return; // Handled
    }
  }

  // 2. Update general mouse/world position for the dumpling (WITH offset)
  updateTouchPosition(touch, rect);
}

function updateTouchPosition(touch, rect) {
  // Offset upward so the dumpling appears above the finger, not under it
  const offsetY = -80;
  mouseNDC.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((touch.clientY + offsetY - rect.top) / rect.height) * 2 + 1;

  mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
  mouse.y = ((touch.clientY + offsetY) / window.innerHeight) * 2 - 1;

  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(cursorPlane, mouseWorld);
}

function handleTouchMove(e) {
  e.preventDefault(); // Prevent scrolling while feeding
  const touch = e.touches[0];
  if (!touch) return;
  updateTouchPosition(touch, canvas.getBoundingClientRect());
}

function handleTouchEnd(e) {
  touchActive = false;
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// No form interactions — pure mouse tracking mode
mode = 'tracking';

// ── Animation loop ──
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  breathPhase += delta * 1.5;

  // ── Camera Lerp ──
  camera.position.lerp(cameraTargetPos, 0.02);
  // Smoother lookAt lerp: compute target quat and slerp
  const currentLookAt = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position);
  currentLookAt.lerp(cameraTargetLookAt, 0.02);
  camera.lookAt(currentLookAt);

  // ── Compute targets from mouse ──
  // Asymmetric Y: allow more downward tilt, less upward
  const mouseYFlipped = -mouse.y; // positive = mouse at top of screen
  const headYTarget = mouseYFlipped > 0
    ? mouseYFlipped * 0.15          // looking up: gentle (was 0.45)
    : mouseYFlipped * LIMITS.headY; // looking down: full range
  const spineYTarget = mouseYFlipped > 0
    ? mouseYFlipped * 0.03          // barely lean back
    : mouseYFlipped * LIMITS.spineY; // lean forward when looking down

  target.headX = clamp(mouse.x * LIMITS.headX, -LIMITS.headX, LIMITS.headX);
  target.headY = clamp(headYTarget, -LIMITS.headY, 0.15);
  target.spineX = clamp(mouse.x * LIMITS.spineX, -LIMITS.spineX, LIMITS.spineX);
  target.spineY = clamp(spineYTarget, -LIMITS.spineY, 0.03);

  // ── Lerp current values toward target ──
  current.eyeX = lerp(current.eyeX, target.eyeX, DAMPING.eye);
  current.eyeY = lerp(current.eyeY, target.eyeY, DAMPING.eye);
  current.headX = lerp(current.headX, target.headX, DAMPING.head);
  current.headY = lerp(current.headY, target.headY, DAMPING.head);
  current.spineX = lerp(current.spineX, target.spineX, DAMPING.spine);
  current.spineY = lerp(current.spineY, target.spineY, DAMPING.spine);

  // ── Apply to bones ──
  // Po's bone local axes (Y-up model, no pivot rotation):
  //   Turn left/right = rotation around Y (yaw)
  //   Tilt up/down    = rotation around X (pitch)
  //   Tilt side       = rotation around Z (roll)

  // Spine/Neck/Head/Eyes: mouse tracking — only when not in eat animation
  if (eat.state === 'tracking' || eat.state === 'respawn') {
    // Spine: very subtle body lean — almost stationary
    if (bones.spine) {
      const rest = restRotations.spine;
      bones.spine.rotation.y = rest.y + current.spineX;
      bones.spine.rotation.x = rest.x + current.spineY;
    }

    // Neck: distribute some of the head tracking here
    if (bones.neck) {
      const rest = restRotations.neck;
      bones.neck.rotation.y = rest.y + current.headX * 0.3;
      bones.neck.rotation.x = rest.x - current.headY * 0.3;
    }

    // Head: main tracking — most visible rotation
    if (bones.head) {
      const rest = restRotations.head;
      bones.head.rotation.y = rest.y + current.headX;
      bones.head.rotation.x = rest.x - current.headY;
    }

    // Eyes: true lookAt — raycast mouse to 3D plane
    if (mouseWorld.length() > 0) {
      [bones.eyeL, bones.eyeR].forEach((eyeBone) => {
        if (!eyeBone) return;
        const key = eyeBone === bones.eyeL ? 'eyeL' : 'eyeR';
        const rest = restRotations[key];

        const eyeWorldPos = new THREE.Vector3();
        eyeBone.getWorldPosition(eyeWorldPos);
        const dir = new THREE.Vector3().subVectors(mouseWorld, eyeWorldPos).normalize();
        const yaw = Math.atan2(dir.x, dir.z);
        const pitch = Math.asin(clamp(dir.y, -1, 1));
        const clampedYaw = clamp(yaw, -0.6, 0.6);
        const clampedPitch = clamp(pitch, -0.25, 0.4);

        eyeBone.rotation.y = lerp(eyeBone.rotation.y, rest.y + clampedYaw, DAMPING.eye);
        eyeBone.rotation.x = lerp(eyeBone.rotation.x, rest.x - clampedPitch, DAMPING.eye);
      });
    }
  }


  // ── Arms: relaxed down from T-pose, reach toward dumpling when close (tracking/respawn) ──
  if (eat.state === 'tracking' || eat.state === 'respawn') {
    // How much to reach — based on dumpling distance to head
    let reach = 0;
    let toFoodX = 0;
    if (dumpling && bones.head && eat.state === 'tracking') {
      const headP = new THREE.Vector3();
      bones.head.getWorldPosition(headP);
      const dumpP = new THREE.Vector3();
      dumpling.getWorldPosition(dumpP);
      const dist = headP.distanceTo(dumpP);
      reach = clamp(1 - (dist - 0.5) / 1.5, 0, 1);
      reach = reach * reach;
      toFoodX = clamp(dumpP.x - headP.x, -1, 1);
    }

    const reachL = reach * clamp(1 - toFoodX, 0.3, 1);
    const reachR = reach * clamp(1 + toFoodX, 0.3, 1);

    // Directional reach — compute arm rotations from shoulder→dumpling direction
    if (dumpling && reach > 0) {
      const dumpW = new THREE.Vector3();
      dumpling.getWorldPosition(dumpW);

      // Helper: compute reach rotations for one arm toward the dumpling
      // Debug reach pose + directional palm twist
      const solveArm = (side, reachAmt) => {
        const clavKey = side === 'L' ? 'clavicleL' : 'clavicleR';
        const armKey = side === 'L' ? 'armL' : 'armR';
        const foreKey = side === 'L' ? 'forearmL' : 'forearmR';
        const handKey = side === 'L' ? 'handL' : 'handR';
        const sign = side === 'L' ? -1 : 1;

        if (!bones[armKey]) return;

        // Direction for small aim offset
        const shoulderPos = new THREE.Vector3();
        bones[armKey].getWorldPosition(shoulderPos);
        const dir = new THREE.Vector3().subVectors(dumpW, shoulderPos).normalize();
        const yaw = Math.atan2(dir.x, dir.z);
        const pitch = Math.asin(clamp(dir.y, -1, 1));

        if (bones[clavKey] && restRotations[clavKey]) {
          bones[clavKey].rotation.x = lerp(bones[clavKey].rotation.x, restRotations[clavKey].x + reachAmt * -0.074, 0.06);
        }

        const rest = restRotations[armKey];
        const idleZ = rest.z + sign * 1.2;
        const idleSway = Math.sin(breathPhase * 0.8 + (side === 'R' ? 0.5 : 0)) * 0.02 * (1 - reachAmt);
        // Base from debug + small directional tweak
        bones[armKey].rotation.x = lerp(bones[armKey].rotation.x, rest.x + reachAmt * (0.089 + pitch * 0.15), 0.06);
        bones[armKey].rotation.y = lerp(bones[armKey].rotation.y, rest.y + reachAmt * (0.217 * -sign + yaw * 0.1 * -sign), 0.06);
        bones[armKey].rotation.z = lerp(bones[armKey].rotation.z, idleZ + idleSway + reachAmt * sign * 0.464, 0.06);

        if (bones[foreKey] && restRotations[foreKey]) {
          bones[foreKey].rotation.x = lerp(bones[foreKey].rotation.x, restRotations[foreKey].x + reachAmt * (0.640 + pitch * 0.1), 0.06);
          bones[foreKey].rotation.y = lerp(bones[foreKey].rotation.y, restRotations[foreKey].y + reachAmt * -0.160 * -sign, 0.06);
          bones[foreKey].rotation.z = lerp(bones[foreKey].rotation.z, restRotations[foreKey].z + reachAmt * 0.335 * sign, 0.06);
        }

        if (bones[handKey] && restRotations[handKey]) {
          bones[handKey].rotation.x = lerp(bones[handKey].rotation.x, restRotations[handKey].x + reachAmt * -0.210, 0.06);
          // Palms face upward
          bones[handKey].rotation.y = lerp(bones[handKey].rotation.y, restRotations[handKey].y + reachAmt * 2.54 * sign, 0.06);
          bones[handKey].rotation.z = lerp(bones[handKey].rotation.z, restRotations[handKey].z, 0.06);
        }
      };

      solveArm('L', reachL);
      solveArm('R', reachR);
    } else {
      // No reach — idle sway
      if (bones.armL) {
        const idleSway = Math.sin(breathPhase * 0.8) * 0.02;
        bones.armL.rotation.x = lerp(bones.armL.rotation.x, restRotations.armL.x, 0.03);
        bones.armL.rotation.y = lerp(bones.armL.rotation.y, restRotations.armL.y, 0.03);
        bones.armL.rotation.z = lerp(bones.armL.rotation.z, restRotations.armL.z - 1.2 + idleSway, 0.03);
      }
      if (bones.armR) {
        const idleSway = Math.sin(breathPhase * 0.8 + 0.5) * 0.02;
        bones.armR.rotation.x = lerp(bones.armR.rotation.x, restRotations.armR.x, 0.03);
        bones.armR.rotation.y = lerp(bones.armR.rotation.y, restRotations.armR.y, 0.03);
        bones.armR.rotation.z = lerp(bones.armR.rotation.z, restRotations.armR.z + 1.2 + idleSway, 0.03);
      }
      if (bones.forearmL) {
        bones.forearmL.rotation.x = lerp(bones.forearmL.rotation.x, restRotations.forearmL.x, 0.03);
        bones.forearmL.rotation.y = lerp(bones.forearmL.rotation.y, restRotations.forearmL.y, 0.03);
        bones.forearmL.rotation.z = lerp(bones.forearmL.rotation.z, restRotations.forearmL.z, 0.03);
      }
      if (bones.forearmR) {
        bones.forearmR.rotation.x = lerp(bones.forearmR.rotation.x, restRotations.forearmR.x, 0.03);
        bones.forearmR.rotation.y = lerp(bones.forearmR.rotation.y, restRotations.forearmR.y, 0.03);
        bones.forearmR.rotation.z = lerp(bones.forearmR.rotation.z, restRotations.forearmR.z, 0.03);
      }
    }
  }

  // ── Jaw: opens wider as dumpling approaches mouth (skip during chewing — eat loop handles it) ──
  if (bones.jaw && (eat.state === 'tracking' || eat.state === 'respawn')) {
    const rest = restRotations.jaw;
    const idleJaw = Math.sin(breathPhase * 0.7) * 0.02;

    let jawOpen = 0.08; // default slight smile
    if (dumpling && bones.head) {
      const headPos = new THREE.Vector3();
      bones.head.getWorldPosition(headPos);
      const dumplingPos = new THREE.Vector3();
      dumpling.getWorldPosition(dumplingPos);
      const dist = headPos.distanceTo(dumplingPos);

      // Map distance: far (>1.2) = closed, close (<0.3) = wide open — snappy response
      const t = clamp(1 - (dist - 0.3) / 0.9, 0, 1); // 0 at dist>=1.2, 1 at dist<=0.3
      jawOpen = 0.08 + t * 1.02; // 0.08 → 1.1
    }

    bones.jaw.rotation.x = lerp(bones.jaw.rotation.x, rest.x + jawOpen + idleJaw, 0.1);
  }

  // ── Idle breathing ──
  if (bones.spine) {
    const breathScale = 1 + Math.sin(breathPhase) * 0.004;
    bones.spine.scale.y = breathScale;
  }

  // ── Grass wind (GPU shader uniform) ──
  if (window._grassMaterial?.userData?.shader) {
    window._grassMaterial.userData.shader.uniforms.uTime.value = clock.elapsedTime;
  }

  // ── Sky procedural clouds (GPU shader uniform) ──
  if (window._skyMaterial) {
    window._skyMaterial.uniforms.uTime.value = clock.elapsedTime;
  }

  // ── Bamboo wind sway ──
  if (window._bambooClones) {
    const time = clock.elapsedTime;
    window._bambooClones.forEach((b) => {
      const phase = time * 1.2 + b.userData.windOffset;
      const sway = Math.sin(phase) * b.userData.windStrength;
      const sway2 = Math.sin(phase * 0.7 + 1.3) * b.userData.windStrength * 0.5;
      b.rotation.z = sway;
      b.rotation.x = sway2;
    });
  }

  // ── Credit Tiles Animation ──
  if (clickableTiles.length > 0) {
    const time = clock.elapsedTime;
    clickableTiles.forEach(tile => {
      // Gentle floating animation
      const hoverShift = tile.userData.hover ? 0.08 : 0;
      const floatY = Math.sin(time * 1.5 + tile.userData.phase) * 0.02;
      tile.position.y = lerp(tile.position.y, tile.userData.baseY + hoverShift + floatY, 0.1);

      const targetScale = tile.userData.hover ? 1.12 : 1.0;
      tile.scale.lerp(new THREE.Vector3(targetScale, targetScale, 1), 0.1);
      
      // Update glow/emissive on hover
      if (tile.material) {
        const emissiveHex = tile.userData.hover ? 0x2a2a6a : 0x000000;
        tile.material.emissive.lerp(new THREE.Color(emissiveHex), 0.1);
        tile.material.emissiveIntensity = tile.userData.hover ? 1.5 : 0;
      }
    });
  }

  // ── Dumpling + Eat state machine ──
  if (dumpling && bones.head) {
    const headPos = new THREE.Vector3();
    bones.head.getWorldPosition(headPos);
    const dist = dumpling.position.distanceTo(headPos);

    // Helper: animate chopstick fall (shared by anticipation & lunge)
    const animateChopstickFall = () => {
      if (chopsticksMesh && chopsticksMesh.visible) {
        eat.chopstickVel.y -= 4 * delta;
        chopsticksMesh.position.addScaledVector(eat.chopstickVel, delta);
        chopsticksMesh.rotation.x += eat.chopstickAngVel.x * delta;
        chopsticksMesh.rotation.y += eat.chopstickAngVel.y * delta;
        chopsticksMesh.rotation.z += eat.chopstickAngVel.z * delta;
        if (chopsticksMesh.material) {
          if (!chopsticksMesh.material._madeTransparent) {
            chopsticksMesh.material = chopsticksMesh.material.clone();
            chopsticksMesh.material.transparent = true;
            chopsticksMesh.material._madeTransparent = true;
          }
          chopsticksMesh.material.opacity = clamp(1 - eat.timer / 1.2, 0, 1);
        }
      }
    };

    // Helper: lerp a bone rotation toward rest
    const lerpToRest = (key, speed) => {
      if (bones[key] && restRotations[key]) {
        bones[key].rotation.x = lerp(bones[key].rotation.x, restRotations[key].x, speed);
        bones[key].rotation.y = lerp(bones[key].rotation.y, restRotations[key].y, speed);
        bones[key].rotation.z = lerp(bones[key].rotation.z, restRotations[key].z, speed);
      }
    };

    if (eat.state === 'tracking' && mouseWorld.length() > 0) {
      // ─── TRACKING: normal cursor follow ───
      dumplingTarget.copy(mouseWorld);
      dumplingTarget.x = clamp(dumplingTarget.x, -3, 3);
      dumplingTarget.y = clamp(dumplingTarget.y, 0.2, 3);
      dumplingTarget.z = clamp(dumplingTarget.z, -0.2, 2);
      dumpling.position.lerp(dumplingTarget, 0.12);
      dumpling.rotation.y += delta * 1.2;
      dumpling.position.y += Math.sin(breathPhase * 2) * 0.003;

      // Synchronized trigger/decay, but wider radius for Mobile touch
      const proximityRadius = isTouchDevice ? 1.2 : 0.92;
      const triggerTime = 3.0;
      const decayRate = 2.0;

      if (dist < proximityRadius) {
        eat.proximityTimer += delta;
      } else {
        eat.proximityTimer = Math.max(0, eat.proximityTimer - delta * decayRate);
      }

      // Eagerness: head shakes and leans toward dumpling as proximity builds
      if (eat.proximityTimer > 0 && bones.head && restRotations.head) {
        const urgency = clamp(eat.proximityTimer / triggerTime, 0, 1); // 0→1 over trigger time
        const easeUrgency = urgency * urgency; // accelerates toward the end

        // Head wobble — frequency and amplitude increase with urgency
        const wobbleFreq = 10 + easeUrgency * 15;  // 10→25 Hz
        const wobbleAmp = 0.04 + easeUrgency * 0.12; // more visible shake
        const wobble = Math.sin(breathPhase * wobbleFreq) * wobbleAmp;
        bones.head.rotation.z = lerp(bones.head.rotation.z, restRotations.head.z + wobble, 0.2);

        // Lean head toward dumpling — gets more desperate
        const dumplingPos = new THREE.Vector3();
        dumpling.getWorldPosition(dumplingPos);
        const headPos2 = new THREE.Vector3();
        bones.head.getWorldPosition(headPos2);
        const towardDir = new THREE.Vector3().subVectors(dumplingPos, headPos2).normalize();

        const leanStrength = easeUrgency * 0.18;
        bones.head.rotation.y = lerp(
          bones.head.rotation.y,
          restRotations.head.y + current.headX + towardDir.x * leanStrength,
          0.08
        );
        bones.head.rotation.x = lerp(
          bones.head.rotation.x,
          restRotations.head.x - current.headY + towardDir.y * leanStrength * 0.5,
          0.08
        );

        // Neck also leans in slightly
        if (bones.neck && restRotations.neck) {
          const neckLean = easeUrgency * 0.06;
          bones.neck.rotation.y = lerp(
            bones.neck.rotation.y,
            restRotations.neck.y + current.headX * 0.3 + towardDir.x * neckLean,
            0.06
          );
        }

        // Arms reach toward dumpling — directional IK, urgency adds to current reach
        const dumpW2 = new THREE.Vector3();
        dumpling.getWorldPosition(dumpW2);
        const headP2 = new THREE.Vector3();
        bones.head.getWorldPosition(headP2);
        const dist2 = headP2.distanceTo(dumpW2);
        const baseReach = clamp(1 - (dist2 - 0.5) / 1.5, 0, 1);
        const intensity = clamp(baseReach * baseReach + easeUrgency * 0.3, 0, 1);

        const solveArmEager = (side, amt) => {
          const armKey = side === 'L' ? 'armL' : 'armR';
          const clavKey = side === 'L' ? 'clavicleL' : 'clavicleR';
          const foreKey = side === 'L' ? 'forearmL' : 'forearmR';
          const handKey = side === 'L' ? 'handL' : 'handR';
          const sign = side === 'L' ? -1 : 1;
          if (!bones[armKey]) return;

          const shoulderPos = new THREE.Vector3();
          bones[armKey].getWorldPosition(shoulderPos);
          const dir = new THREE.Vector3().subVectors(dumpW2, shoulderPos).normalize();
          const yaw = Math.atan2(dir.x, dir.z);
          const pitch = Math.asin(clamp(dir.y, -1, 1));

          if (bones[clavKey] && restRotations[clavKey]) {
            bones[clavKey].rotation.x = lerp(bones[clavKey].rotation.x, restRotations[clavKey].x + amt * -0.074, 0.08);
          }
          bones[armKey].rotation.x = lerp(bones[armKey].rotation.x, restRotations[armKey].x + amt * (0.089 + pitch * 0.15), 0.08);
          bones[armKey].rotation.y = lerp(bones[armKey].rotation.y, restRotations[armKey].y + amt * (0.217 * -sign + yaw * 0.1 * -sign), 0.08);
          bones[armKey].rotation.z = lerp(bones[armKey].rotation.z, restRotations[armKey].z + sign * 1.2 + amt * sign * 0.464, 0.08);

          if (bones[foreKey] && restRotations[foreKey]) {
            bones[foreKey].rotation.x = lerp(bones[foreKey].rotation.x, restRotations[foreKey].x + amt * (0.640 + pitch * 0.1), 0.08);
            bones[foreKey].rotation.y = lerp(bones[foreKey].rotation.y, restRotations[foreKey].y + amt * -0.160 * -sign, 0.08);
            bones[foreKey].rotation.z = lerp(bones[foreKey].rotation.z, restRotations[foreKey].z + amt * 0.335 * sign, 0.08);
          }
          if (bones[handKey] && restRotations[handKey]) {
            bones[handKey].rotation.x = lerp(bones[handKey].rotation.x, restRotations[handKey].x + amt * -0.210, 0.08);
            // Palms face upward
            bones[handKey].rotation.y = lerp(bones[handKey].rotation.y, restRotations[handKey].y + Math.min(amt, 1) * 2.54 * sign, 0.08);
            bones[handKey].rotation.z = lerp(bones[handKey].rotation.z, restRotations[handKey].z, 0.08);
          }
        };

        const reachL2 = clamp(1 - towardDir.x, 0.3, 1) * intensity;
        const reachR2 = clamp(1 + towardDir.x, 0.3, 1) * intensity;
        solveArmEager('L', reachL2);
        solveArmEager('R', reachR2);
      }

      if (eat.proximityTimer >= triggerTime) {
        eat.state = 'anticipation';
        eat.timer = 0;
        eat.proximityTimer = 0;

        // Detach chopsticks — they drop during anticipation
        if (chopsticksMesh) {
          const worldPos = new THREE.Vector3();
          const worldQuat = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          chopsticksMesh.getWorldPosition(worldPos);
          chopsticksMesh.getWorldQuaternion(worldQuat);
          chopsticksMesh.getWorldScale(worldScale);
          chopsticksMesh.removeFromParent();
          scene.add(chopsticksMesh);
          chopsticksMesh.position.copy(worldPos);
          chopsticksMesh.quaternion.copy(worldQuat);
          chopsticksMesh.scale.copy(worldScale);
          eat.chopstickVel.set(
            (Math.random() - 0.5) * 1.5,
            1.5 + Math.random() * 0.5,
            (Math.random() - 0.5) * 1
          );
          eat.chopstickAngVel.set(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
          );
        }
      }

    } else if (eat.state === 'anticipation') {
      // ─── ANTICIPATION (1.0s): wind up — head pulls back, jaw opens, eyes lock on ───
      eat.timer += delta;
      const t = clamp(eat.timer / 1.0, 0, 1);
      const easeIn = t * t;

      // Dumpling drifts toward mouth slowly (teasing)
      dumpling.position.lerp(headPos, 0.02);
      dumpling.rotation.y += delta * 0.3;

      // Chopsticks fall
      animateChopstickFall();

      // Jaw opens wide — eager mouth
      if (bones.jaw && restRotations.jaw) {
        bones.jaw.rotation.x = lerp(
          bones.jaw.rotation.x,
          restRotations.jaw.x + 0.08 + easeIn * 1.3,
          0.12
        );
      }

      // Head pulls BACK (winding up for lunge) and tilts down slightly to aim at dumpling
      if (bones.head && restRotations.head) {
        bones.head.rotation.x = lerp(
          bones.head.rotation.x,
          restRotations.head.x + easeIn * 0.15, // tilt down toward food
          0.08
        );
      }

      // Neck extends back
      if (bones.neck && restRotations.neck) {
        bones.neck.rotation.x = lerp(
          bones.neck.rotation.x,
          restRotations.neck.x - easeIn * 0.1, // pull neck back
          0.08
        );
      }

      // Spine leans back slightly (coiling)
      if (bones.spine && restRotations.spine) {
        bones.spine.rotation.x = lerp(
          bones.spine.rotation.x,
          restRotations.spine.x - easeIn * 0.04, // lean back
          0.06
        );
      }

      // Eyes lock onto dumpling (override normal tracking — look slightly down and forward)
      [bones.eyeL, bones.eyeR].forEach((eye) => {
        if (!eye) return;
        const key = eye === bones.eyeL ? 'eyeL' : 'eyeR';
        const rest = restRotations[key];
        eye.rotation.x = lerp(eye.rotation.x, rest.x + 0.15, 0.1); // look down at food
        eye.rotation.y = lerp(eye.rotation.y, rest.y, 0.1);
      });

      // Arms reach toward dumpling — directional IK
      {
        const dumpW3 = new THREE.Vector3();
        dumpling.getWorldPosition(dumpW3);
        const headPos3 = new THREE.Vector3();
        bones.head.getWorldPosition(headPos3);
        const toFood = new THREE.Vector3().subVectors(dumpW3, headPos3).normalize();
        const intensity = 1 + easeIn * 0.5;

        const solveArmAntic = (side, amt) => {
          const armKey = side === 'L' ? 'armL' : 'armR';
          const clavKey = side === 'L' ? 'clavicleL' : 'clavicleR';
          const foreKey = side === 'L' ? 'forearmL' : 'forearmR';
          const handKey = side === 'L' ? 'handL' : 'handR';
          const sign = side === 'L' ? -1 : 1;
          if (!bones[armKey]) return;

          const shoulderPos = new THREE.Vector3();
          bones[armKey].getWorldPosition(shoulderPos);
          const dir = new THREE.Vector3().subVectors(dumpW3, shoulderPos).normalize();
          const yaw = Math.atan2(dir.x, dir.z);
          const pitch = Math.asin(clamp(dir.y, -1, 1));

          if (bones[clavKey] && restRotations[clavKey]) {
            bones[clavKey].rotation.x = lerp(bones[clavKey].rotation.x, restRotations[clavKey].x + amt * -0.074, 0.1);
          }
          bones[armKey].rotation.x = lerp(bones[armKey].rotation.x, restRotations[armKey].x + amt * (0.089 + pitch * 0.15), 0.1);
          bones[armKey].rotation.y = lerp(bones[armKey].rotation.y, restRotations[armKey].y + amt * (0.217 * -sign + yaw * 0.1 * -sign), 0.1);
          bones[armKey].rotation.z = lerp(bones[armKey].rotation.z, restRotations[armKey].z + sign * 1.2 + amt * sign * 0.464, 0.1);

          if (bones[foreKey] && restRotations[foreKey]) {
            bones[foreKey].rotation.x = lerp(bones[foreKey].rotation.x, restRotations[foreKey].x + amt * (0.640 + pitch * 0.1), 0.1);
            bones[foreKey].rotation.y = lerp(bones[foreKey].rotation.y, restRotations[foreKey].y + amt * -0.160 * -sign, 0.1);
            bones[foreKey].rotation.z = lerp(bones[foreKey].rotation.z, restRotations[foreKey].z + amt * 0.335 * sign, 0.1);
          }
          if (bones[handKey] && restRotations[handKey]) {
            bones[handKey].rotation.x = lerp(bones[handKey].rotation.x, restRotations[handKey].x + amt * -0.210, 0.1);
            // Palms face upward
            bones[handKey].rotation.y = lerp(bones[handKey].rotation.y, restRotations[handKey].y + Math.min(amt, 1) * 2.54 * sign, 0.1);
            bones[handKey].rotation.z = lerp(bones[handKey].rotation.z, restRotations[handKey].z, 0.1);
          }
        };

        const reachL = clamp(1 - toFood.x, 0.5, 1) * intensity;
        const reachR = clamp(1 + toFood.x, 0.5, 1) * intensity;
        solveArmAntic('L', reachL);
        solveArmAntic('R', reachR);
      }

      // Transition to lunge
      if (eat.timer > 1.0) {
        eat.state = 'lunge';
        eat.timer = 0;
        if (chopsticksMesh) chopsticksMesh.visible = false;

        // ── Camera Zoom In (Triggered at Lunge) ──
        cameraTargetPos.set(0, 1.3, isTouchDevice ? 3.0 : 3.2);
        cameraTargetLookAt.set(0, 1.2, 0);
      }

    } else if (eat.state === 'lunge') {
      // ─── LUNGE (3.5s): 4 chomps with jaw Y/Z, belly pat from 1s, smile + wide eyes from 2s ───
      eat.timer += delta;
      const duration = 3.5;
      const t = clamp(eat.timer / duration, 0, 1);

      // ── Dumpling consumed in first chomp ──
      const shrinkT = clamp(eat.timer / 0.25, 0, 1);
      const shrinkEase = 1 - (1 - shrinkT) * (1 - shrinkT) * (1 - shrinkT);
      dumpling.position.lerp(headPos, 0.3);
      dumpling.scale.setScalar(Math.max(eat.originalDumplingScale * (1 - shrinkEase), 0.001));
      if (shrinkT >= 1) dumpling.visible = false;

      // ── Phase blends ──
      const chompPhase = clamp(1 - (eat.timer - 1.7) / 0.3, 0, 1); // 1→0 from 1.7s to 2.0s (chomps fade)
      const patPhase = clamp((eat.timer - 0.8) / 0.4, 0, 1);       // 0→1 from 0.8s to 1.2s (pat fades in)
      const smilePhase = clamp((eat.timer - 1.8) / 0.4, 0, 1);     // 0→1 from 1.8s to 2.2s (smile + wide eyes)

      // ── Head: lunge forward on first bite, then settle ──
      if (bones.head && restRotations.head) {
        const lungeAmount = eat.timer < 0.3 ? 0.2 : 0.2 * clamp(1 - (eat.timer - 0.3) / 1.0, 0, 1);
        const sway = Math.sin(eat.timer * 2.2) * 0.02 * (1 - chompPhase * 0.5);
        bones.head.rotation.x = lerp(bones.head.rotation.x, restRotations.head.x - lungeAmount, 0.2);
        bones.head.rotation.y = lerp(bones.head.rotation.y, restRotations.head.y + sway, 0.06);
      }

      // ── Neck ──
      if (bones.neck && restRotations.neck) {
        const neckAmount = eat.timer < 0.3 ? 0.15 : 0.15 * clamp(1 - (eat.timer - 0.3) / 1.0, 0, 1);
        bones.neck.rotation.x = lerp(bones.neck.rotation.x, restRotations.neck.x + neckAmount, 0.2);
      }

      // ── Spine ──
      if (bones.spine && restRotations.spine) {
        const spineAmount = eat.timer < 0.3 ? 0.06 : 0.06 * clamp(1 - (eat.timer - 0.3) / 1.0, 0, 1);
        bones.spine.rotation.x = lerp(bones.spine.rotation.x, restRotations.spine.x + spineAmount, 0.12);
        bones.spine.rotation.y = lerp(bones.spine.rotation.y, restRotations.spine.y, 0.04);
      }

      // ── Jaw: 4 chomps with Y/Z for natural chewing, then smile ──
      if (bones.jaw && restRotations.jaw) {
        const bites = [
          { start: 0.00, open: 1.3,  openDur: 0.10, snapDur: 0.06, pause: 0.34 },
          { start: 0.50, open: 0.6,  openDur: 0.08, snapDur: 0.05, pause: 0.32 },
          { start: 0.95, open: 0.35, openDur: 0.07, snapDur: 0.04, pause: 0.29 },
          { start: 1.35, open: 0.2,  openDur: 0.06, snapDur: 0.04, pause: 0.25 },
        ];
        const elapsed = eat.timer;
        let jawOpenTarget = restRotations.jaw.x + 0.02;
        let biteActive = false;

        for (const bite of bites) {
          const biteEnd = bite.start + bite.openDur + bite.snapDur + bite.pause;
          if (elapsed >= bite.start && elapsed < biteEnd) {
            biteActive = true;
            const biteLocal = elapsed - bite.start;
            if (biteLocal < bite.openDur) {
              const openT = biteLocal / bite.openDur;
              jawOpenTarget = restRotations.jaw.x + bite.open * openT * openT;
            } else if (biteLocal < bite.openDur + bite.snapDur) {
              const closeT = (biteLocal - bite.openDur) / bite.snapDur;
              jawOpenTarget = restRotations.jaw.x + bite.open * (1 - closeT * closeT * closeT);
            } else {
              jawOpenTarget = restRotations.jaw.x + 0.02;
            }
            break;
          }
        }

        // Broader smile after chomps fade
        const smile = smilePhase * 0.25;
        bones.jaw.rotation.x = jawOpenTarget + smile;

        // Jaw Y/Z — lateral shift + roll during chewing for natural motion
        const jawY = biteActive
          ? Math.sin(elapsed * 6.5) * 0.04 + Math.sin(elapsed * 3.2 + 0.7) * 0.02
          : smilePhase * 0.02; // settle to slight offset for smile
        const jawZ = biteActive
          ? Math.sin(elapsed * 4.8 + 1.2) * 0.04
          : 0;
        bones.jaw.rotation.y = lerp(bones.jaw.rotation.y, restRotations.jaw.y + jawY, 0.15);
        bones.jaw.rotation.z = lerp(bones.jaw.rotation.z, restRotations.jaw.z + jawZ, 0.15);
      }

      // ── Eyes: squeeze on first bite → relax → wide + happy during pat ──
      [bones.eyeL, bones.eyeR].forEach((eye) => {
        if (!eye) return;
        const key = eye === bones.eyeL ? 'eyeL' : 'eyeR';
        const rest = restRotations[key];
        const drift = Math.sin(eat.timer * 1.5 + (key === 'eyeL' ? 0 : 0.5)) * 0.04;
        let eyeTarget;
        if (eat.timer < 0.3) {
          eyeTarget = rest.x + 0.4; // squeeze shut
        } else {
          // Blend from relaxed-down to wide-open
          const relaxed = rest.x + 0.15 + drift;
          const wide = rest.x - 0.15 + drift * 0.3;
          eyeTarget = relaxed + (wide - relaxed) * smilePhase;
        }
        eye.rotation.x = lerp(eye.rotation.x, eyeTarget, eat.timer < 0.3 ? 0.2 : 0.06);
        eye.rotation.y = lerp(eye.rotation.y, rest.y + drift * 0.3, 0.04);
      });

      // ── Arms: eat pose (debug) during chomp, crossfade to proud (debug) for belly pat ──
      {
        const armSpeed = 0.04 + patPhase * 0.04;

        // Eat pose targets (from debug — hands stacked, not mirrored)
        const eatPose = {
          clavL: { x: -0.074, y: 0, z: 0 },
          clavR: { x: -0.074, y: 0, z: 0 },
          armL:  { x: 0.089, y: 0.217, z: -1.664 },
          armR:  { x: 0.089, y: -0.217, z: 1.664 },
          foreL: { x: 0.640, y: 0.160, z: -0.335 },
          foreR: { x: 0.640, y: -0.160, z: 0.335 },
          handL: { x: 1.140, y: -2.990, z: 0.673 },
          handR: { x: 0.650, y: 2.230, z: -0.393 },
        };
        // Proud pose targets (from debug — arms on belly)
        const proudPose = {
          clavL: { x: 0.046, y: 0.231, z: 0 },
          clavR: { x: 0.046, y: -0.231, z: 0 },
          armL:  { x: -0.291, y: -0.143, z: -1.200 },
          armR:  { x: -0.361, y: 0.063, z: 1.286 },
          foreL: { x: -1.190, y: -0.080, z: -0.165 },
          foreR: { x: -1.170, y: 0.080, z: 0.165 },
          handL: { x: -0.470, y: 0, z: 0 },
          handR: { x: -0.620, y: -0.160, z: 0 },
        };

        // Blend: eat → proud as patPhase rises (0→1 from 0.8s to 1.2s)
        const mix = (e, p) => e + (p - e) * patPhase;

        // Clavicles
        if (bones.clavicleL && restRotations.clavicleL) {
          bones.clavicleL.rotation.x = lerp(bones.clavicleL.rotation.x, restRotations.clavicleL.x + mix(eatPose.clavL.x, proudPose.clavL.x), armSpeed);
          bones.clavicleL.rotation.y = lerp(bones.clavicleL.rotation.y, restRotations.clavicleL.y + mix(eatPose.clavL.y, proudPose.clavL.y), armSpeed);
          bones.clavicleL.rotation.z = lerp(bones.clavicleL.rotation.z, restRotations.clavicleL.z + mix(eatPose.clavL.z, proudPose.clavL.z), armSpeed);
        }
        if (bones.clavicleR && restRotations.clavicleR) {
          bones.clavicleR.rotation.x = lerp(bones.clavicleR.rotation.x, restRotations.clavicleR.x + mix(eatPose.clavR.x, proudPose.clavR.x), armSpeed);
          bones.clavicleR.rotation.y = lerp(bones.clavicleR.rotation.y, restRotations.clavicleR.y + mix(eatPose.clavR.y, proudPose.clavR.y), armSpeed);
          bones.clavicleR.rotation.z = lerp(bones.clavicleR.rotation.z, restRotations.clavicleR.z + mix(eatPose.clavR.z, proudPose.clavR.z), armSpeed);
        }

        // Arms
        if (bones.armL && restRotations.armL) {
          bones.armL.rotation.x = lerp(bones.armL.rotation.x, restRotations.armL.x + mix(eatPose.armL.x, proudPose.armL.x), armSpeed);
          bones.armL.rotation.y = lerp(bones.armL.rotation.y, restRotations.armL.y + mix(eatPose.armL.y, proudPose.armL.y), armSpeed);
          bones.armL.rotation.z = lerp(bones.armL.rotation.z, restRotations.armL.z + mix(eatPose.armL.z, proudPose.armL.z), armSpeed);
        }
        if (bones.armR && restRotations.armR) {
          bones.armR.rotation.x = lerp(bones.armR.rotation.x, restRotations.armR.x + mix(eatPose.armR.x, proudPose.armR.x), armSpeed);
          bones.armR.rotation.y = lerp(bones.armR.rotation.y, restRotations.armR.y + mix(eatPose.armR.y, proudPose.armR.y), armSpeed);
          bones.armR.rotation.z = lerp(bones.armR.rotation.z, restRotations.armR.z + mix(eatPose.armR.z, proudPose.armR.z), armSpeed);
        }

        // Forearms
        if (bones.forearmL && restRotations.forearmL) {
          bones.forearmL.rotation.x = lerp(bones.forearmL.rotation.x, restRotations.forearmL.x + mix(eatPose.foreL.x, proudPose.foreL.x), armSpeed);
          bones.forearmL.rotation.y = lerp(bones.forearmL.rotation.y, restRotations.forearmL.y + mix(eatPose.foreL.y, proudPose.foreL.y), armSpeed);
          bones.forearmL.rotation.z = lerp(bones.forearmL.rotation.z, restRotations.forearmL.z + mix(eatPose.foreL.z, proudPose.foreL.z), armSpeed);
        }
        if (bones.forearmR && restRotations.forearmR) {
          bones.forearmR.rotation.x = lerp(bones.forearmR.rotation.x, restRotations.forearmR.x + mix(eatPose.foreR.x, proudPose.foreR.x), armSpeed);
          bones.forearmR.rotation.y = lerp(bones.forearmR.rotation.y, restRotations.forearmR.y + mix(eatPose.foreR.y, proudPose.foreR.y), armSpeed);
          bones.forearmR.rotation.z = lerp(bones.forearmR.rotation.z, restRotations.forearmR.z + mix(eatPose.foreR.z, proudPose.foreR.z), armSpeed);
        }

        // Hands — blend eat→proud, with belly-rub oscillation on handR.x during pat phase
        const rubOsc = Math.sin(eat.timer * 8) * 0.25 * patPhase; // oscillate handR.x
        if (bones.handL && restRotations.handL) {
          bones.handL.rotation.x = lerp(bones.handL.rotation.x, restRotations.handL.x + mix(eatPose.handL.x, proudPose.handL.x), armSpeed);
          bones.handL.rotation.y = lerp(bones.handL.rotation.y, restRotations.handL.y + mix(eatPose.handL.y, proudPose.handL.y), armSpeed);
          bones.handL.rotation.z = lerp(bones.handL.rotation.z, restRotations.handL.z + mix(eatPose.handL.z, proudPose.handL.z), armSpeed);
        }
        if (bones.handR && restRotations.handR) {
          bones.handR.rotation.x = lerp(bones.handR.rotation.x, restRotations.handR.x + mix(eatPose.handR.x, proudPose.handR.x) + rubOsc, armSpeed);
          bones.handR.rotation.y = lerp(bones.handR.rotation.y, restRotations.handR.y + mix(eatPose.handR.y, proudPose.handR.y), armSpeed);
          bones.handR.rotation.z = lerp(bones.handR.rotation.z, restRotations.handR.z + mix(eatPose.handR.z, proudPose.handR.z), armSpeed);
        }
      }

      if (eat.timer >= duration) {
        eat.state = 'proud';
        eat.timer = 0;
        eat.proudBubbleShown = false;
        dumpling.visible = false;

        // ── Camera Zoom Out (Starts 2s earlier, at transition to Proud) ──
        cameraTargetPos.copy(baseCameraPos);
        cameraTargetLookAt.copy(baseCameraLookAt);
      }

    } else if (eat.state === 'proud') {
      // ─── PROUD (1.5s): ta-da pose — arms out, chest puffed ───
      eat.timer += delta;

      if (!eat.proudBubbleShown) {
        eat.proudBubbleShown = true;
        showChatBubble("I'm happy!");
      }
      const t = clamp(eat.timer / 1.5, 0, 1);
      const easeOut = 1 - (1 - t) * (1 - t);

      // Jaw: content smile
      if (bones.jaw && restRotations.jaw) {
        bones.jaw.rotation.x = lerp(bones.jaw.rotation.x, restRotations.jaw.x + 0.12, 0.06);
      }

      // Head tilts back proudly
      if (bones.head && restRotations.head) {
        bones.head.rotation.x = lerp(bones.head.rotation.x, restRotations.head.x - 0.12, 0.06);
        bones.head.rotation.y = lerp(bones.head.rotation.y, restRotations.head.y, 0.06);
      }

      lerpToRest('neck', 0.04);

      // Eyes look up — proud
      [bones.eyeL, bones.eyeR].forEach((eye) => {
        if (!eye) return;
        const key = eye === bones.eyeL ? 'eyeL' : 'eyeR';
        const rest = restRotations[key];
        eye.rotation.x = lerp(eye.rotation.x, rest.x - 0.12, 0.04);
        eye.rotation.y = lerp(eye.rotation.y, rest.y, 0.04);
      });

      // Spine: slight proud puff
      if (bones.spine && restRotations.spine) {
        bones.spine.rotation.x = lerp(bones.spine.rotation.x, restRotations.spine.x - 0.03, 0.05);
        bones.spine.rotation.y = lerp(bones.spine.rotation.y, restRotations.spine.y, 0.05);
      }

      // Arms: proud pose from debug with belly-rub oscillation on handR.x
      {
        const rubOsc = Math.sin(eat.timer * 8) * 0.25;

        // Left side (from debug)
        if (bones.clavicleL && restRotations.clavicleL) {
          bones.clavicleL.rotation.x = lerp(bones.clavicleL.rotation.x, restRotations.clavicleL.x + 0.046, 0.06);
          bones.clavicleL.rotation.y = lerp(bones.clavicleL.rotation.y, restRotations.clavicleL.y + 0.231, 0.06);
          bones.clavicleL.rotation.z = lerp(bones.clavicleL.rotation.z, restRotations.clavicleL.z, 0.06);
        }
        if (bones.armL && restRotations.armL) {
          bones.armL.rotation.x = lerp(bones.armL.rotation.x, restRotations.armL.x - 0.291, 0.06);
          bones.armL.rotation.y = lerp(bones.armL.rotation.y, restRotations.armL.y - 0.143, 0.06);
          bones.armL.rotation.z = lerp(bones.armL.rotation.z, restRotations.armL.z - 1.200, 0.06);
        }
        if (bones.forearmL && restRotations.forearmL) {
          bones.forearmL.rotation.x = lerp(bones.forearmL.rotation.x, restRotations.forearmL.x - 1.190, 0.06);
          bones.forearmL.rotation.y = lerp(bones.forearmL.rotation.y, restRotations.forearmL.y - 0.080, 0.06);
          bones.forearmL.rotation.z = lerp(bones.forearmL.rotation.z, restRotations.forearmL.z - 0.165, 0.06);
        }
        if (bones.handL && restRotations.handL) {
          bones.handL.rotation.x = lerp(bones.handL.rotation.x, restRotations.handL.x - 0.470, 0.06);
          bones.handL.rotation.y = lerp(bones.handL.rotation.y, restRotations.handL.y, 0.06);
          bones.handL.rotation.z = lerp(bones.handL.rotation.z, restRotations.handL.z, 0.06);
        }

        // Right side (from debug — asymmetric values)
        if (bones.clavicleR && restRotations.clavicleR) {
          bones.clavicleR.rotation.x = lerp(bones.clavicleR.rotation.x, restRotations.clavicleR.x + 0.046, 0.06);
          bones.clavicleR.rotation.y = lerp(bones.clavicleR.rotation.y, restRotations.clavicleR.y - 0.231, 0.06);
          bones.clavicleR.rotation.z = lerp(bones.clavicleR.rotation.z, restRotations.clavicleR.z, 0.06);
        }
        if (bones.armR && restRotations.armR) {
          bones.armR.rotation.x = lerp(bones.armR.rotation.x, restRotations.armR.x - 0.361, 0.06);
          bones.armR.rotation.y = lerp(bones.armR.rotation.y, restRotations.armR.y + 0.063, 0.06);
          bones.armR.rotation.z = lerp(bones.armR.rotation.z, restRotations.armR.z + 1.286, 0.06);
        }
        if (bones.forearmR && restRotations.forearmR) {
          bones.forearmR.rotation.x = lerp(bones.forearmR.rotation.x, restRotations.forearmR.x - 1.170, 0.06);
          bones.forearmR.rotation.y = lerp(bones.forearmR.rotation.y, restRotations.forearmR.y + 0.080, 0.06);
          bones.forearmR.rotation.z = lerp(bones.forearmR.rotation.z, restRotations.forearmR.z + 0.165, 0.06);
        }
        if (bones.handR && restRotations.handR) {
          bones.handR.rotation.x = lerp(bones.handR.rotation.x, restRotations.handR.x - 0.620 + rubOsc, 0.06);
          bones.handR.rotation.y = lerp(bones.handR.rotation.y, restRotations.handR.y - 0.160, 0.06);
          bones.handR.rotation.z = lerp(bones.handR.rotation.z, restRotations.handR.z, 0.06);
        }
      }

      if (eat.timer > 1.5) {
        eat.state = 'respawn';
        eat.timer = 0;
        eat.bubbleShown = false;
      }

    } else if (eat.state === 'respawn') {
      // ─── RESPAWN: gentle settle back to rest, then new dumpling ───
      eat.timer += delta;
      const duration = 2.8;
      const t = clamp(eat.timer / duration, 0, 1);

      // Slow ease-out lerp — faster at start, gentle at end
      const speed = 0.02 + (1 - t) * 0.03; // 0.05 → 0.02

      // Core bones settle first (faster)
      ['spine', 'neck', 'head', 'jaw', 'eyeL', 'eyeR'].forEach(k => lerpToRest(k, speed + 0.01));
      // Arms/hands settle slightly slower so they don't jerk
      ['armL', 'armR', 'forearmL', 'forearmR', 'clavicleL', 'clavicleR', 'handL', 'handR'].forEach(k => lerpToRest(k, speed));

      // Show chat bubble at 0.5s into respawn
      if (eat.timer > 0.5 && !eat.bubbleShown) {
        eat.bubbleShown = true;
        showChatBubble('Feed me again!');
      }

      if (eat.timer > duration) {
        dumpling.scale.setScalar(eat.originalDumplingScale);
        dumpling.visible = true;

        // Spawn at random edge
        const side = Math.random();
        if (side < 0.5) {
          dumpling.position.set(side < 0.25 ? -3 : 3, 1 + Math.random(), 2);
        } else {
          dumpling.position.set((Math.random() - 0.5) * 4, 2.5, 2);
        }

        // Reattach chopsticks
        if (chopsticksMesh && chopsticksOrigParent) {
          chopsticksMesh.removeFromParent();
          chopsticksOrigParent.add(chopsticksMesh);
          chopsticksMesh.position.copy(chopsticksOrigLocal.pos);
          chopsticksMesh.rotation.copy(chopsticksOrigLocal.rot);
          chopsticksMesh.scale.copy(chopsticksOrigLocal.scl);
          chopsticksMesh.visible = true;
          if (chopsticksMesh.material) chopsticksMesh.material.opacity = 1;
        }

        eat.state = 'tracking';
        eat.timer = 0;
      }
    }
  }
  // ── Chat bubble animation ──
  if (chatSprite && chatAnim.active) {
    chatAnim.timer += delta;
    const { timer, duration, fadeIn, fadeOut } = chatAnim;

    // Opacity: fade in → hold → fade out
    let opacity;
    if (timer < fadeIn) {
      opacity = timer / fadeIn;
    } else if (timer > duration - fadeOut) {
      opacity = clamp((duration - timer) / fadeOut, 0, 1);
    } else {
      opacity = 1;
    }

    // Bouncy scale-in
    const scaleT = clamp(timer / 0.5, 0, 1);
    const bounce = scaleT < 1 ? 1 + Math.sin(scaleT * Math.PI) * 0.15 : 1;

    chatSprite.material.opacity = opacity;
    const canvas = chatSprite.material.map.image;
    const aspect = canvas.width / canvas.height;
    const baseH = 0.22;
    chatSprite.scale.set(baseH * aspect * bounce, baseH * bounce, 1);

    // Gentle float relative to baseY
    chatSprite.position.y = chatAnim.baseY + Math.sin(timer * 2) * 0.015;

    if (timer >= duration) {
      chatAnim.active = false;
      scene.remove(chatSprite);
      chatSprite.material.map.dispose();
      chatSprite.material.dispose();
      chatSprite = null;
    }
  }

  // ── Face morphs: big smile + happy eyes while chewing/proud ──
  if (faceMesh) {
    let smileTarget = 0, eyesTarget = 0;
    if (eat.state === 'chewing') { smileTarget = 0.35; eyesTarget = 0.25; }
    else if (eat.state === 'proud') { smileTarget = 1.0; eyesTarget = 1.0; }
    const dict = faceMesh.morphTargetDictionary;
    const inf = faceMesh.morphTargetInfluences;
    const si = dict[FACE_KEYS.smile];
    const ei = dict[FACE_KEYS.eyes];
    inf[si] = lerp(inf[si], smileTarget, smileTarget > inf[si] ? 0.10 : 0.04);
    inf[ei] = lerp(inf[ei], eyesTarget, eyesTarget > inf[ei] ? 0.10 : 0.04);
  }

  // ── Time-of-day + volumetric clouds (low-res RT, then blitted by the dome) ──
  if (todTween.active) {
    const e = (clock.elapsedTime - todTween.t0) / todTween.dur;
    if (e >= 1) { todState.t = ((todTween.to % 1) + 1) % 1; todTween.active = false; }
    else {
      const k = e < 0.5 ? 4*e*e*e : 1 - Math.pow(-2*e + 2, 3) / 2; // easeInOutCubic
      todState.t = (((todTween.from + (todTween.to - todTween.from) * k) % 1) + 1) % 1;
    }
  } else if (todState.auto) {
    todState.t = (todState.t + delta / todState.cycleSeconds) % 1;
  }
  applyTimeOfDay(todState.t);
  // amortized volumetric clouds (opt-in) — render BEFORE flagging the shadow
  // update so this RT pass doesn't consume the throttled shadow-map render
  if (vcfg.enabled) updateVolumetricClouds();
  // throttle shadow-map re-renders (full caster pass) — the sun moves slowly
  _shadowAccum += delta;
  if (_shadowAccum >= 1 / perfCfg.shadowHz) { _shadowAccum = 0; renderer.shadowMap.needsUpdate = true; }
  if (window.__skyScrubberSync) window.__skyScrubberSync();

  if (composer) {
    // Dynamically calculate focus plane distance based on the camera position
    // relative to Po's face center (stable point at 0, 1.1, 0.2) to prevent any blur on Po
    const facePos = new THREE.Vector3(0, 1.1, 0.2);
    bokehPass.uniforms[ 'focus' ].value = camera.position.distanceTo(facePos);
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

// ── Handle resize ──
window.addEventListener('resize', resize);
resize();

// ══════════════════════════════════════════════════════════
// ── Oogway Ascends – Web Audio Synthesizer ──
// ══════════════════════════════════════════════════════════

const oogwayMusic = (() => {
  let ctx = null, masterGain = null, reverbGain = null;
  let playing = false, loopTimeout = null;

  // C major scale: Key0=C4 … Key14=C6
  const FREQS = [
    261.63, 293.66, 329.63, 349.23, 392.00,  // C4–G4
    440.00, 493.88, 523.25, 587.33, 659.25,   // A4–E5
    698.46, 783.99, 880.00, 987.77, 1046.50   // F5–C6
  ];

  const SONG = [
    // [keyIndex, timeMs]  — parsed from Sky Music JSON
    [0,700],[2,700],[7,700],[7,1700],[12,2200],[2,2700],[4,2700],[11,2700],
    [9,3700],[1,4700],[3,4700],[8,4700],[9,5200],[8,5700],[7,6200],
    [3,6700],[5,6700],[7,6700],[6,7700],[2,8700],[4,8700],[7,8700],
    [9,9700],[14,10200],[2,10700],[4,10700],[13,10700],[11,11700],[9,12200],
    [1,12700],[3,12700],[8,12700],[9,13200],[11,13700],[9,14200],
    [4,14700],[6,14700],[8,14700],[2,15700],[4,16200],
    [3,16700],[5,16700],[7,16700],[12,17700],[11,18200],
    [2,18700],[4,18700],[11,18700],[1,19700],[2,20200],
    [1,20700],[3,20700],[10,21700],[9,22200],
    [2,22700],[4,22700],[9,22700],[2,23700],[4,24200],
    [3,24700],[5,24700],[7,24700],[7,25200],[5,25700],[4,26200],
    [0,26700],[2,26700],[4,27200],[1,27700],[0,28200],
    [0,28700],[2,28700],[5,28700],[7,29700],[12,30200],
    [2,30700],[4,30700],[6,30700],[4,31200],
    [1,31700],[3,31700],[8,31700],[9,32200],[8,32700],[7,33200],
    [3,33700],[5,33700],[7,33700],[6,34700],
    [4,35700],[7,35700],[9,36200],[14,36700],
    [2,37200],[4,37200],[13,37200],[11,37700],[9,38200],
    [1,38700],[3,38700],[8,38700],[9,39200],[11,39700],[9,40200],
    [4,40700],[6,40700],[8,40700],[2,41700],[4,42200],
    [3,42700],[5,42700],[7,42700],[12,43700],[11,44200],
    [2,44700],[4,44700],[11,44700],[1,45200],[2,45700],
    [1,46200],[3,46200],[10,47200],[9,47700],
    [2,48200],[4,48200],[9,48200],[2,49200],[4,49700],
    [3,50200],[5,50200],[7,50200],[7,50700],[5,51200],[4,51700],
    [0,52200],[2,52200],[4,52700],[1,53200],[0,53700],
    [0,54200],[2,54200],[5,54200],
    [0,55200],[2,55200],[5,55200],[7,55200],[9,55200],[12,55200],[14,55200],
    [5,55700],[7,55700],[9,55700],[12,55700],
    [9,56700],[12,56700],[14,56700]
  ];

  const SONG_DURATION = 58000; // ms before loop

  function initCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master volume
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.35;

    // Simple delay-based reverb
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;
    reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.4;

    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    masterGain.connect(ctx.destination);
    masterGain.connect(delay);
  }

  function playNote(freq, when) {
    // Main tone — soft sine
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Slight detune layer for warmth
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.002;

    // Envelope
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(0.18, when + 0.05);   // attack
    env.gain.exponentialRampToValueAtTime(0.08, when + 0.4); // decay
    env.gain.exponentialRampToValueAtTime(0.001, when + 2.0); // release

    osc.connect(env);
    osc2.connect(env);
    env.connect(masterGain);

    osc.start(when);
    osc2.start(when);
    osc.stop(when + 2.2);
    osc2.stop(when + 2.2);
  }

  function scheduleSong() {
    const now = ctx.currentTime + 0.1;
    for (const [key, timeMs] of SONG) {
      playNote(FREQS[key], now + timeMs / 1000);
    }
    // Loop
    loopTimeout = setTimeout(() => {
      if (playing) scheduleSong();
    }, SONG_DURATION);
  }

  function start() {
    initCtx();
    if (ctx.state === 'suspended') ctx.resume();
    playing = true;
    scheduleSong();
  }

  function stop() {
    playing = false;
    if (loopTimeout) clearTimeout(loopTimeout);
    if (ctx) ctx.suspend();
  }

  function toggle() {
    if (playing) { stop(); return false; }
    else { start(); return true; }
  }

  return { start, stop, toggle, get playing() { return playing; } };
})();

// ── Music toggle button ──
const musicBtn = document.createElement('button');
musicBtn.id = 'musicToggle';
musicBtn.dataset.track = 'music_toggle';
musicBtn.innerHTML = '♪';
musicBtn.title = 'Play Oogway Ascends';
musicBtn.style.cssText = `
  position: fixed; bottom: 20px; right: 20px; z-index: 1000;
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(0,0,0,0.5); color: #fff; border: 2px solid rgba(255,255,255,0.3);
  font-size: 22px; cursor: pointer; backdrop-filter: blur(8px);
  transition: all 0.3s ease; opacity: 0; display: none;
  align-items: center; justify-content: center; font-family: sans-serif;
`;
musicBtn.addEventListener('mouseenter', () => { musicBtn.style.opacity = '1'; musicBtn.style.transform = 'scale(1.1)'; });
musicBtn.addEventListener('mouseleave', () => { musicBtn.style.opacity = '0.7'; musicBtn.style.transform = 'scale(1)'; });
musicBtn.addEventListener('click', () => {
  const on = oogwayMusic.toggle();
  musicBtn.innerHTML = on ? '♪' : '<span style="opacity:0.4">♪</span>';
  musicBtn.title = on ? 'Mute' : 'Play Oogway Ascends';
  musicBtn.style.borderColor = on ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
});
document.body.appendChild(musicBtn);
