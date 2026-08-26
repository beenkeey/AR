const params = new URLSearchParams(window.location.search);

function isWeakDevice() {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  return cores <= 4 || memory <= 4;
}

const weak = isWeakDevice();

export const DEBUG = params.get('debug') === '1';
export const WORLD_TRACKING_ENABLED = params.get('wt') !== '0' && params.get('worldTracking') !== '0';

/** Exhibition tower height in meters. Camera sits outside this volume. */
export const EXHIBITION_MODEL_SCALE = 8;

const targetParam = params.get('target');
const usePrecompiledTarget = targetParam === 'precompiled';
const useTestTarget = targetParam === 'test';

export const CONFIG = {
  model: {
    url: '/assets/models/rig.glb',
    scale: 0.28,
    rotationDeg: [0, 0, 0],
    offset: [0, 0, 0],
  },
  target: {
    mode: usePrecompiledTarget ? 'PRECOMPILED' : 'RUNTIME',
    imageUrl: (usePrecompiledTarget || useTestTarget)
      ? '/assets/targets/mindar-card-test.png'
      : '/assets/targets/rig-target.png',
    mindUrl: usePrecompiledTarget ? '/assets/targets/mindar-card-test.mind' : null,
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
  placement: {
    fallbackDistance: 1.4,
  },
  performance: {
    maxPixelRatio: weak ? 1 : 1.5,
    weak,
    disableHeavyEffects: weak,
  },
  activation: {
    durationMs: 80,
  },
  exhibition: {
    modelScale: EXHIBITION_MODEL_SCALE,
    distance: 9,
    eyeHeight: 1.6,
    fadeMs: 420,
  },
  hyperspace: {
    durationMs: 1100,
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
