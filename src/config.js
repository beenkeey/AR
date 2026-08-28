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
    // Clockwise 90° from the current facing, as seen from above / from the child
    // looking at the tower. Three.js +Y is CCW, so clockwise = −Y.
    // Model +X (yellow / equipment / right side) then faces the camera.
    startYaw: -Math.PI / 2,
    heli: {
      scale: 3.5,
      duration: 52,
      waypoints: [
        [24, 66, -22],
        [16, 72, -40],
        [-10, 68, -34],
        [-22, 75, -56],
        [6, 80, -72],
        [28, 69, -60],
        [32, 65, -36],
      ],
    },
    heliFar: [
      {
        scale: 1.35,
        duration: 88,
        waypoints: [
          [96, 38, -118],
          [48, 44, -148],
          [-18, 40, -128],
          [36, 46, -96],
        ],
      },
      {
        scale: 1.05,
        duration: 114,
        waypoints: [
          [-92, 34, 86],
          [-128, 40, 28],
          [-86, 32, -36],
          [-48, 38, 52],
        ],
      },
    ],
    bus: { x: 18, y: 0, z: 16, yaw: -0.55, scale: 1.45 },
  },
  hyperspace: {
    durationMs: 1900,
  },
};

export const MESSAGES = {
  scan: 'Наведите камеру на буровую',
  tapToStart: 'Нажмите, чтобы начать',
  loading: 'Загрузка…',
  compiling: 'Подготовка распознавания…',
  targetFound: 'Цель найдена',
  fixing: 'Фиксируем положение в пространстве',
  unsupported: 'Это устройство или браузер не поддерживает необходимый режим AR.',
  cameraDenied: 'Для работы AR необходимо разрешить доступ к камере.',
  genericError: 'Не удалось запустить AR. Обновите страницу и попробуйте снова.',
};
