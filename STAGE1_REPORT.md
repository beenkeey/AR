# Stage 1 — Technical report: Rig Trigger AR

## Question this stage answers

Can a physical drilling rig be used as a **one-shot recognition trigger**, after which a virtual model stays **world-anchored** and remains visible when the physical object leaves the camera?

Required pipeline:

```text
PHYSICAL TARGET → targetFound → CREATE WORLD PLACEMENT → DETACH FROM TARGET TRACKING → AR MODE
```

Not acceptable:

```text
targetFound → show model
targetLost → hide model
```

## Technology analysis

### iOS Safari (primary device)

| Capability | Status (as of 2026) | Implication |
|---|---|---|
| `getUserMedia` camera | Available in a secure context (HTTPS) | Scan UI can show the live camera |
| WebXR `immersive-ar` | **Not supported** (Safari iOS through current caniuse/WebKit data) | Cannot use ARKit world tracking from the browser |
| WebXR anchors / hit-test | Unavailable without immersive-ar | No standard world anchors |
| AR Quick Look / USDZ | Available | New AR session → **new origin**. Cannot keep the pose from a previous image-detection step |
| MindAR / AR.js image tracking | Works | Marker pose only. Coordinate system is camera-relative. Freezing the last matrix does **not** survive walking around |
| AlvaAR (open-source WASM SLAM) | Experimental, works with a camera stream | Only realistic **free** WebAR path for independent world tracking on iOS Safari |
| 8th Wall / Niantic / Zappar | Commercial, iOS Safari SLAM | Production-quality version of the same idea |
| Native ARKit | Full VIO + image/object anchors | Correct production architecture if WebAR quality is not enough |

Safari 18+ blog posts that claim native WebXR AR on iPhone are not consistent with caniuse and Apple/WebKit status: `immersive-ar` remains unavailable on iOS Safari.

Chrome on iOS uses WebKit, so it has the same AR limitation.

### Android Chrome

WebXR `immersive-ar` + anchors **does** work (ARCore). That is a strong world-tracking backend. It is **not** used as the Stage 1 default, because:

1. The product target is iPhone/iPad.
2. Starting WebXR after `getUserMedia` detection creates a **new** world origin, so the virtual model would not stay where the physical rig was.
3. WebXR image tracking is still experimental / flag-gated.

### MindAR used as world tracking

Rejected. MindAR keeps the Three.js camera at the origin and moves the target. If the target is lost, a “frozen” object stays in **camera space**, so it sticks to the phone, not to the room.

### Chosen Stage 1 stack

```text
JavaScript + Three.js
    + MindAR Controller   → one-shot image recognition
    + AlvaAR WASM SLAM    → independent world tracking after detach
```

Flow actually implemented:

```text
camera
  → MindAR targetFound
  → wait until AlvaAR has a camera pose
  → snapshot world placement
  → keep SLAM running
  → stop needing the physical target
  → model stays in the Three.js/AlvaAR world
```

This is the only free-browser architecture that can even attempt the required iOS behaviour. It is **not** ARKit-quality.

## Project structure

```text
src/
├── ar/
│   ├── ARSession.js          camera, Three.js renderer, render loop
│   ├── WorldAnchor.js        persistent world group, independent of target
│   ├── TrackingManager.js    backend selection
│   ├── AlvaARTracker.js      visual SLAM
│   └── WebXRTracker.js       capability probe / future Android path
├── recognition/
│   └── TargetRecognition.js  MindAR one-shot image target
├── effects/
│   ├── ScanEffect.js         Stage 2 stub
│   ├── HyperSpeedEffect.js   Stage 2 stub
│   └── ActivationSequence.js passthrough in Stage 1
├── model/
│   └── RigModel.js           GLB loader + configurable transform
├── ui/
│   ├── ScanUI.js
│   ├── ARUI.js
│   ├── BackButton.js
│   ├── ErrorUI.js
│   ├── LoadingUI.js
│   └── DebugPanel.js
├── app/
│   ├── AppState.js           SCAN → TARGET_FOUND → ACTIVATION → AR_VIEW
│   └── App.js
├── config.js
└── main.js
```

## Files created (high level)

- `package.json`, `vite.config.js`, `index.html`, `print-target.html`, `README.md`
- `src/**` modules listed above
- `public/vendor/alva_ar.js` (AlvaAR, GPLv3)
- `public/assets/targets/rig-target.png` generated printable image target
- `public/assets/models/rig.glb` generated placeholder derrick
- `scripts/generate-assets.mjs`

## What already works (by design, in code)

- State machine `SCAN → TARGET_FOUND → ACTIVATION → AR_VIEW → BACK → SCAN`
- Camera start with iOS user-gesture + permission errors
- Unsupported-device message
- Image target recognition as a trigger, not as a parent of the model
- World anchor that is **not** destroyed on `targetLost`
- Independent SLAM camera updates after detach
- Configurable GLB scale / rotation / offset
- `?debug=1` panel: state, target, tracking, world anchor, pose, scale, FPS
- Console log sequence including `Target lost` without removing the model
- Back button resets the session and allows a new scan
- No hyperspeed / particle activation (intentionally deferred)

## What is not implemented

- Stage 2 activation / hyperspeed / flash / particles
- True 3D object scanning of the physical rig (ARKit `ARReferenceObject`)
- Native iOS app
- 8th Wall / other commercial SLAM
- Production GLB of the real rig
- Gravity-aligned placement (AlvaAR has no IMU fusion yet)
- Automatic on-device proof of the walk-around scenario from this Windows workstation

## Known limitations

1. **iOS Safari has no WebXR AR.** World tracking is experimental WASM SLAM, not ARKit.
2. **AlvaAR needs visual features and camera motion** to initialise. Empty tables, poor lighting, or holding the phone still can prevent a pose.
3. **Tracking can drift or be lost** when the user turns to a featureless wall. The model is **not hidden** on SLAM loss; the camera freezes at the last pose, so the illusion may stick until tracking recovers.
4. **Image target ≠ 3D object recognition.** A photo or printed target is required. The physical rig is recognised only from a similar viewpoint.
5. **MindAR units and AlvaAR units are different.** `target-matrix` placement can be wrong; the code falls back to `look-at-distance` if the matrix is not sane. Perfect millimetre registration is not claimed.
6. **AlvaAR is GPLv3.** Shipping this SLAM in a product requires GPL compliance or a different backend.
7. **Self-signed HTTPS** is required for LAN testing; the user must trust the certificate on the iPhone.

## Result of the scenario test

Environment of this implementation: Windows workstation, no iPhone attached, no WebXR AR in desktop browsers.

| Step | Result |
|---|---|
| 1. Launch on iPhone/iPad | **Not executed here.** App is HTTPS + Safari-oriented; must be verified on device. |
| 2–4. Point at target, get virtual rig | Implemented. Needs a printed target or a photo of the real rig. |
| 5. Remove physical target | Implemented: `targetLost` does not hide or dispose the model. |
| 6–7. Walk / look away | Relies on AlvaAR SLAM. **Not proven on a real iPhone in this session.** |
| 8. Look back, model still in the same place | **Unverified on device.** This is the go/no-go gate before Stage 2. |

If step 8 fails on a real iPhone, **do not implement effects.** Next options:

1. Tune AlvaAR resolution / lighting / motion during init, retry on device.
2. Switch to a commercial WebAR SLAM (8th Wall / Niantic / Zappar) that already does image-target → world tracking on iOS Safari.
3. Build a native iOS app with ARKit:

```swift
ARWorldTrackingConfiguration
  detectionImages / ARReferenceObject
  on image/object detected → add ARAnchor
  keep world tracking after the physical target leaves the frame
```

ARKit is the only fully reliable way to get “physical rig as trigger, then walk around a stable hologram” at production quality on iPhone/iPad.

## Native ARKit path (if WebAR is not enough)

A small native app (Swift / RealityKit or SceneKit) should:

1. Use `ARWorldTrackingConfiguration` with `detectionImages` (photos of the rig) or a scanned `ARReferenceObject`.
2. On first detection, create an `ARAnchor` at that world pose.
3. Attach the USDZ/GLB to that anchor.
4. Ignore subsequent `ARImageAnchor` removed callbacks for visibility.
5. Let ARKit VIO keep the anchor stable while the user walks.

That is exactly the required state machine, with Apple’s tracker instead of AlvaAR.

## Stage 2 gate

Proceed to activation effects **only after** an on-device log that looks like:

```text
[AR] Session started
[AR] Target found
[AR] Creating world placement
[AR] World placement created
[AR] Starting activation
[AR] Activation completed
[AR] Entering AR_VIEW
[AR] Target lost
[AR] Target tracking no longer required
```

and the user can look away, walk, look back, and still see the model in the same place (`World anchor: CREATED`, model still visible, no reload).
