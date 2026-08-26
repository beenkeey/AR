export const debugState = {
  appState: 'SCAN',
  target: 'LOST',
  alvaStatus: 'INITIALIZING',
  worldAnchor: 'NOT CREATED',
  placementStatus: 'PENDING',
  placementMode: 'NONE',
  modelVisible: 'HIDDEN',
  worldTracking: 'INACTIVE',
  cameraPoseValid: 'INVALID',
  referencePose: 'NOT SET',
  cameraMoved: 'NO',
  poseDelta: 'N/A',
  alvaInstance: 'NOT CREATED',
  alvaFrames: 0,
  modelX: 'N/A',
  modelY: 'N/A',
  modelZ: 'N/A',
  modelRotation: 'N/A',
  modelScale: 'N/A',
  cameraTracking: 'N/A',
  cameraPosition: 'N/A',
  cameraRotation: 'N/A',
  cameraWorldPosition: 'N/A',
  cameraWorldRotation: 'N/A',
  modelWorldPosition: 'N/A',
  modelWorldScale: 'N/A',
  modelCameraDistance: 'N/A',
  modelMode: 'HIDDEN',
  modelTransformUpdates: 0,
  effect: 'NONE',
  cameraMode: 'SCAN',
  fps: 'N/A',

  targetStatus: 'N/A',
  targetImageUrl: 'N/A',
  targetImageSize: 'N/A',
  compilerStatus: 'IDLE',
  compilerError: 'N/A',
  mindBufferSize: 'N/A',
  compileMs: 'N/A',
  controllerStatus: 'NOT_READY',
  controllerError: 'N/A',
  videoSize: 'N/A',
  videoAttrSize: 'N/A',
  videoRealSize: 'N/A',
  videoReadyState: 'N/A',
  cameraStreamActive: 'N/A',
  recognitionFrames: 0,
  matchFrames: 0,
  nullMatrixFrames: 0,
  processVideoCalls: 0,
  recognitionState: 'IDLE',
  lastFoundAt: 'N/A',
  lastLostAt: 'N/A',
  targetMode: 'N/A',
};

export function formatVec3(v, digits = 2) {
  if (!v || !Number.isFinite(v.x)) return 'N/A';
  return `${v.x.toFixed(digits)}, ${v.y.toFixed(digits)}, ${v.z.toFixed(digits)}`;
}

export function formatEuler(euler, digits = 1) {
  if (!euler || !Number.isFinite(euler.x)) return 'N/A';
  const d = 180 / Math.PI;
  return `${(euler.x * d).toFixed(digits)}, ${(euler.y * d).toFixed(digits)}, ${(euler.z * d).toFixed(digits)}`;
}

export function formatScalar(value, digits = 2) {
  if (!Number.isFinite(value)) return 'N/A';
  return value.toFixed(digits);
}

export function formatTimestamp(date = new Date()) {
  return date.toISOString().slice(11, 23);
}

export function bufferByteLength(buffer) {
  if (!buffer) return 0;
  if (typeof buffer.byteLength === 'number') return buffer.byteLength;
  if (typeof buffer.length === 'number') return buffer.length;
  return 0;
}
