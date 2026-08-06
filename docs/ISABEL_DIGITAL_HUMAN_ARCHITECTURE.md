# Isabel Digital Human Architecture

## Purpose
This document converts the user-provided digital-human research into implementation rules for Isabel.

## Core decision
Isabel V1 is a deterministic real-time 3D digital human, not a video-only avatar. The persistent office requires precise interaction with the desk, chair, monitors, user gaze, pointing, walking, sitting, and hand contact. Therefore the core stack remains:

MPFB/MakeHuman -> Blender -> Mixamo-compatible humanoid rig -> GLB -> Three.js runtime -> semantic behavior layer.

Neural generation is additive, not foundational.

## Traditional 3D layers required for V1

### Geometry and identity
- High-quality human base mesh with reproducible Isabel likeness targets.
- Front-view likeness is the first acceptance gate.
- Profile/depth tuning remains conservative until verified reference evidence exists.

### Rigging
- Mixamo-compatible full-body skeleton for browser retargeting.
- Root normalized for Three.js runtime.
- Contact-aware hands and feet through IK/runtime solving.
- Dedicated eye bones are desirable, but ARKit eye-look morphs are the guaranteed first gaze path.

### Facial rig
- ARKit-style facial blendshapes for brows, lids, cheeks, jaw and eye-look behavior.
- Meta/Oculus visemes for lip sync.
- Keep facial identity morphs separate from runtime expression morphs.
- Hundreds of FACS shapes are a future quality tier, not a blocker for the first working Isabel.

### Materials
- Physically based skin materials.
- Subsurface-scattering-ready material design to reduce waxy skin.
- Natural roughness variation, pores/freckles and non-airbrushed skin response.
- Realistic eye materials with corneal/specular behavior.
- Hair should move toward strand/card systems rather than a solid helmet mesh.

### Motion
- Full-body animation retargeting for idle, work, notice, stand, walk, turn, sit, present, point, reach and return-to-desk states.
- Animation crossfades and root anchors keep the room fixed while Isabel moves.
- IK/contact stabilization for chair, desk, feet and monitor interactions.
- Motion capture data can later replace generic animation clips without changing the runtime contract.

## Neural layers that may improve Isabel later

### Audio-to-lip and gesture generation
Useful as an enhancement once the deterministic facial and body rigs are proven. Neural output should drive semantic or morph targets, not replace the rig.

### Neural expression transfer
Potential future layer for subtle head motion, micro-expression and conversational timing. Must remain bounded by the existing facial rig so output is deterministic and interruptible.

### NeRF / Gaussian splatting
Do not use as Isabel's primary representation for V1. These methods are powerful for photoreal capture and free-viewpoint imagery, but are weaker for the precise skeletal interaction, sitting, hand contacts, animation retargeting and persistent editable office behavior required by Isabel.

Possible later uses:
- photoreal reference reconstruction,
- environment capture,
- high-detail head/skin reference,
- hybrid rendering experiments.

## Capture strategy
We do not need a multi-camera light stage to prove Isabel V1. The practical path is staged quality:

1. Reproducible MPFB identity mesh from the locked reference.
2. PBR skin, hair and wardrobe quality pass.
3. Mixamo-compatible body motion and IK.
4. ARKit/viseme facial performance.
5. Automated front-render likeness comparison.
6. Optional higher-fidelity scan/capture or neural head refinement after the full interaction loop works.

If future production requires actor-grade realism, the architecture remains compatible with photogrammetry, 4D capture or a replacement scan mesh as long as the same skeleton and facial contracts are preserved.

## Acceptance rule
A technically valid GLB is not success. Isabel is accepted only when:
- she is recognizably the locked Isabel,
- skin/eyes/hair read as a believable person rather than a mannequin,
- speech, blink and gaze are natural,
- she can work, notice the user, stand, walk, present, return, sit and resume work,
- contacts with floor, chair, desk and monitors are stable,
- the office stays spatially fixed,
- the full loop works in the browser at interactive frame rates.

## Long-term quality ladder
V1: real-time rigged digital human with solid likeness and interaction.
V2: better FACS coverage, eye system, skin SSS, hair, motion-capture clips and micro-motion.
V3: actor/scan-quality head and skin, neural micro-expression/gesture assistance, optional advanced capture pipelines.
