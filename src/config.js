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

/** World-space bounding height of the whole industrial complex, metres. */
export const EXHIBITION_MODEL_SCALE = 55;

const targetParam = params.get('target');
const usePrecompiledTarget = targetParam === 'precompiled';
const useTestTarget = targetParam === 'test';

export const CONFIG = {
  model: {
    url: assetUrl('assets/models/rig.glb'),
    scale: 0.28,
    rotationDeg: [0, 0, 0],
    offset: [0, 0, 0],
  },
  target: {
    mode: usePrecompiledTarget ? 'PRECOMPILED' : 'RUNTIME',
    imageUrl: (usePrecompiledTarget || useTestTarget)
      ? assetUrl('assets/targets/mindar-card-test.png')
      : assetUrl('assets/targets/rig-target.png'),
    mindUrl: usePrecompiledTarget ? assetUrl('assets/targets/mindar-card-test.mind') : null,
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
    distance: 50,
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
    drones: [
      {
        scale: 3.4,
        duration: 42,
        waypoints: [
          [40, 8, 10],
          [20, 14, -35],
          [-25, 12, -30],
          [-38, 10, 15],
          [-10, 16, 40],
          [30, 11, 32],
        ],
      },
      {
        scale: 2.8,
        duration: 58,
        waypoints: [
          [28, -2, 20],
          [10, 4, -28],
          [-22, 2, -18],
          [-18, 6, 24],
          [8, 3, 30],
        ],
      },
      {
        scale: 2.4,
        duration: 50,
        waypoints: [
          [15, -8, 8],
          [-8, -4, -20],
          [-20, -6, 5],
          [5, -2, 22],
        ],
      },
    ],
    belazRoutes: [
      {
        // Upper bench spiral
        scale: 1.4,
        duration: 58,
        waypoints: [
          [58, -0.1, 8],
          [40, -0.1, 48],
          [-8, -0.1, 58],
          [-52, -0.1, 20],
          [-48, -0.1, -35],
          [5, -0.1, -58],
          [55, -0.1, -25],
        ],
      },
      {
        // Mid bench
        scale: 1.2,
        duration: 64,
        waypoints: [
          [46, -5.4, -10],
          [25, -5.4, 40],
          [-30, -5.4, 38],
          [-45, -5.4, -5],
          [-20, -5.4, -42],
          [35, -5.4, -35],
        ],
      },
      {
        // Deep bench toward bottom
        scale: 1.1,
        duration: 70,
        waypoints: [
          [30, -11.0, 5],
          [12, -11.0, 28],
          [-22, -11.0, 20],
          [-28, -11.0, -12],
          [-5, -11.0, -30],
          [24, -11.0, -18],
        ],
      },
    ],
  },
  hyperspace: {
    durationMs: 1900,
  },
};

export const MESSAGES = {
  scan: 'Наведите камеру на маркер месторождения',
  tapToStart: 'Нажмите, чтобы начать',
  loading: 'Загрузка…',
  compiling: 'Подготовка распознавания…',
  targetFound: 'Цель найдена',
  fixing: 'Фиксируем положение в пространстве',
  unsupported: 'Это устройство или браузер не поддерживает необходимый режим AR.',
  cameraDenied: 'Для работы AR необходимо разрешить доступ к камере.',
  genericError: 'Не удалось запустить AR. Обновите страницу и попробуйте снова.',
};
