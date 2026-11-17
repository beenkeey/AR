const params = new URLSearchParams(window.location.search);

/** Public-folder URL that respects Vite `base` (GitHub Pages `/AR/`). */
export function assetUrl(path) {
  return `${import.meta.env.BASE_URL}${String(path).replace(/^\//, '')}`;
}

function isWeakDevice() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  return cores <= 4 || memory <= 4;
}

const weak = isWeakDevice();

export const DEBUG = params.get('debug') === '1';
export const WORLD_TRACKING_ENABLED = params.get('wt') !== '0' && params.get('worldTracking') !== '0';

/** World-space bounding height of the centerpiece, metres (keep modest vs pit). */
export const EXHIBITION_MODEL_SCALE = 12;

const targetParam = params.get('target');
// Custom coal-quarry marker (runtime compile). ?target=test → old MindAR Soft card.
const useTestCard = targetParam === 'test' || targetParam === 'precompiled';

export const CONFIG = {
  model: {
    url: assetUrl('assets/models/rig.glb'),
    scale: 0.28,
    rotationDeg: [0, 0, 0],
    offset: [0, 0, 0],
  },
  target: {
    mode: useTestCard ? 'PRECOMPILED' : 'RUNTIME',
    imageUrl: useTestCard
      ? assetUrl('assets/targets/mindar-card-test.png')
      : assetUrl('assets/targets/coal-quarry-marker.png'),
    mindUrl: useTestCard ? assetUrl('assets/targets/mindar-card-test.mind') : null,
    physicalWidthMeters: 0.2,
  },
  camera: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  slam: {
    maxWidth: 480,
    fps: weak ? 20 : 24,
  },
  worldTracking: {
    collisionPadding: 0.32,
    minEyeY: 0.45,
    jumpPos: 0.9,
    jumpRot: 0.5,
    translationDeadzone: 0.012,
    // Horizontal Alva delta below this is treated as stand-still / look-only.
    moveDeadzone: 0.02,
    // Max XZ applied from one Alva pose; leftover is discarded, never chased.
    maxDeltaPerFrame: 0.04,
    // Hard cap around exhibition spawn so Alva scale drift cannot fly the camera.
    maxRadius: 2.5,
    positionGain: 1,
  },
  cameraSmoothing: {
    position: 2.4,
    rotation: 3.2,
  },
  placement: {
    fallbackDistance: 1.4,
  },
  performance: {
    maxPixelRatio: 2.25,
    weak,
    disableHeavyEffects: weak,
  },
  activation: {
    durationMs: 80,
  },
  exhibition: {
    modelScale: EXHIBITION_MODEL_SCALE,
    hugeHeight: EXHIBITION_MODEL_SCALE,
    overviewHeight: 2.35,
    distance: 38,
    eyeHeight: 1.22,
    lookY: 0.05,
    lookDistance: 2.4,
    fadeMs: 480,
    scaleMs: 1000,
    cameraFov: 66,
    cameraNear: 0.08,
    cameraFar: 420,
    walkSpeed: 1.15,
    stepMeters: 0.62,
    stepAccel: 1.35,
    walkAccel: 0.85,
    walkAccelForce: 2.4,
    walkDamp: 3.4,
    startYaw: -Math.PI / 2,
    // Waypoints are local to quarry center (inside the pit bowl).
    // Small drones high over the bowl
    drones: [
      {
        scale: 1.05,
        duration: 46,
        phase: 0,
        waypoints: [
          [40, 36, 10],
          [10, 42, -34],
          [-32, 38, -18],
          [-20, 44, 28],
          [22, 40, 30],
        ],
      },
      {
        scale: 0.9,
        duration: 58,
        phase: 0.4,
        waypoints: [
          [18, 48, 20],
          [-14, 52, -22],
          [-28, 46, 8],
          [8, 50, 26],
        ],
      },
    ],
    // Circular haul-road loops on separate benches + phase offset (not one line)
    belazRoutes: [
      {
        scale: 1.55,
        duration: 64,
        phase: 0.0,
        waypoints: [
          [71, 0.06, 0],
          [50, 0.06, 50],
          [0, 0.06, 71],
          [-50, 0.06, 50],
          [-71, 0.06, 0],
          [-50, 0.06, -50],
          [0, 0.06, -71],
          [50, 0.06, -50],
        ],
      },
      {
        scale: 1.35,
        duration: 72,
        phase: 0.37,
        waypoints: [
          [58, -4.72, 0],
          [41, -4.72, 41],
          [0, -4.72, 58],
          [-41, -4.72, 41],
          [-58, -4.72, 0],
          [-41, -4.72, -41],
          [0, -4.72, -58],
          [41, -4.72, -41],
        ],
      },
      {
        scale: 1.2,
        duration: 80,
        phase: 0.68,
        waypoints: [
          [46, -9.72, 0],
          [32.5, -9.72, 32.5],
          [0, -9.72, 46],
          [-32.5, -9.72, 32.5],
          [-46, -9.72, 0],
          [-32.5, -9.72, -32.5],
          [0, -9.72, -46],
          [32.5, -9.72, -32.5],
        ],
      },
    ],
  },
  hyperspace: {
    durationMs: 1900,
  },
};

export const MESSAGES = {
  scan: 'Наведите камеру на печатный маркер',
  scanHint: 'Не на QR — на печатный маркер карьера',
  tapToStart: 'Нажмите, чтобы начать',
  loading: 'Загрузка…',
  compiling: 'Подготовка распознавания…',
  targetFound: 'Цель найдена',
  fixing: 'Фиксируем положение в пространстве',
  unsupported: 'Это устройство или браузер не поддерживает необходимый режим AR.',
  cameraDenied: 'Для работы AR необходимо разрешить доступ к камере.',
  genericError: 'Не удалось запустить AR. Обновите страницу и попробуйте снова.',
};
