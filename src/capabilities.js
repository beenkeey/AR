export async function probeCapabilities() {
  const isiOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const secure = window.isSecureContext;
  const media = Boolean(navigator.mediaDevices?.getUserMedia);

  let webxrAR = false;
  try {
    webxrAR = Boolean(await navigator.xr?.isSessionSupported?.('immersive-ar'));
  } catch {
    webxrAR = false;
  }

  return {
    isiOS,
    secure,
    media,
    webxrAR,
    webgl: hasWebGL(),
  };
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function describeBackend(capabilities) {
  if (capabilities.webxrAR && !capabilities.isiOS) return 'webxr';
  return 'alva';
}
