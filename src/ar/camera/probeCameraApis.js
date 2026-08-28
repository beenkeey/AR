import { debugState } from '../../debugState.js';

/**
 * Runtime feature detection for exhibition camera backends.
 * Results are written to debugState. This is not a guess — it queries the APIs.
 */
export async function probeCameraApis() {
  const xr = navigator.xr ?? null;
  let immersiveAR = false;
  let immersiveARError = xr ? 'queried' : 'navigator.xr missing';
  if (xr?.isSessionSupported) {
    try {
      immersiveAR = Boolean(await xr.isSessionSupported('immersive-ar'));
      immersiveARError = immersiveAR ? 'supported' : 'not supported';
    } catch (err) {
      immersiveAR = false;
      immersiveARError = String(err?.message || err);
    }
  }

  const result = {
    webxrAvailable: Boolean(xr),
    immersiveAR,
    immersiveARError,
    deviceOrientation: typeof DeviceOrientationEvent !== 'undefined',
    deviceMotion: typeof DeviceMotionEvent !== 'undefined',
    orientationPermissionAPI: typeof DeviceOrientationEvent?.requestPermission === 'function',
    motionPermissionAPI: typeof DeviceMotionEvent?.requestPermission === 'function',
    camera: Boolean(navigator.mediaDevices?.getUserMedia),
    orientationPermission: 'NOT ASKED',
    motionPermission: 'NOT ASKED',
  };

  applyProbeDebug(result);
  return result;
}

export function applyProbeDebug(probe) {
  debugState.webxrAvailable = probe.webxrAvailable ? 'YES' : 'NO';
  debugState.immersiveAR = probe.immersiveAR ? 'YES' : `NO (${probe.immersiveARError})`;
  debugState.deviceOrientationAvailable = probe.deviceOrientation ? 'YES' : 'NO';
  debugState.deviceMotionAvailable = probe.deviceMotion ? 'YES' : 'NO';
  debugState.cameraAvailable = probe.camera ? 'YES' : 'NO';
  debugState.orientationPermission = probe.orientationPermission;
  debugState.motionPermission = probe.motionPermission;
}

/**
 * Orientation permission is requested only from DeviceRotation.requestPermissionFromGesture()
 * during the Start tap. This helper never calls requestPermission().
 */
export function applyOrientationPermission(probe, status) {
  probe.orientationPermission = status;
  if (probe.motionPermissionAPI) probe.motionPermission = 'NOT REQUESTED';
  else probe.motionPermission = probe.deviceMotion ? 'NOT REQUIRED' : 'UNAVAILABLE';
  applyProbeDebug(probe);
  return probe;
}
