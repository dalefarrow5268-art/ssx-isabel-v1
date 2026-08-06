# Isabel Character Asset Pipeline

This directory defines the production path for replacing the temporary Three.js mannequin with the identity-locked Isabel character.

## Goal

Create one permanent `public/models/isabel/isabel-v1.glb` asset that:

- matches the approved Isabel face references
- contains a full articulated body
- contains expressive eyes, jaw, brows, lips, and blink controls
- supports reusable animation clips
- can be loaded and controlled locally in Three.js
- does not depend on Tavus, HeyGen, D-ID, or another avatar runtime

## Source references

Use only the approved Isabel headshot and approved character board as identity authority. Do not use the woman baked into the old office photograph.

## Build stages

### 1. Geometry reconstruction

Recommended research path:

- reconstruct the face from the approved headshot
- reconstruct a clothed body from the approved full-body reference
- join the head and body into one clean production mesh
- retopologize for predictable facial and body deformation

Research systems such as DECA, SMPL-X, ECON, and related open-source work can inform this stage, but their model licenses must be reviewed before any commercial use. The shipped Isabel asset must have clear commercial rights.

### 2. Skeleton

Required bones:

- Hips
- Spine
- Chest
- Neck
- Head
- LeftEye
- RightEye
- shoulders, arms, forearms, hands, fingers
- thighs, calves, feet, toes

### 3. Facial controls

Required morph targets:

- eyeBlinkLeft
- eyeBlinkRight
- jawOpen
- mouthSmileLeft
- mouthSmileRight
- browInnerUp
- viseme_sil
- viseme_PP
- viseme_FF
- viseme_TH
- viseme_DD
- viseme_kk
- viseme_CH
- viseme_SS
- viseme_nn
- viseme_RR
- viseme_aa
- viseme_E
- viseme_ih
- viseme_oh
- viseme_ou

### 4. Motion clips

Required animation clips:

- Idle_Seated
- Idle_Standing
- Type
- Read
- Turn_Head
- Turn_Chair
- Stand
- Walk
- Stop
- Pivot
- Present_Small
- Listen
- Sit

### 5. Export

Export one binary glTF file:

`public/models/isabel/isabel-v1.glb`

The file must include:

- body mesh
- skeleton
- facial morph targets
- animation clips
- embedded or relative textures
- meter-based scale
- Y-up orientation

### 6. Validation

Run:

```bash
node tools/isabel-model/validate-manifest.mjs
```

This validates the contract expected by the browser runtime. Once the GLB is added, the Three.js scene can load it in place of the temporary mannequin without changing Isabel's behavior engine.
