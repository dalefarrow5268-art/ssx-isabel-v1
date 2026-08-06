# Isabel Character Integration Plan

## Objective
Build one persistent, rigged Isabel that visually matches the locked reference images and can live continuously inside the Unreal office. We do not generate a new person per scene.

## Character truth
- Face and hair are governed by `isabel_identity_lock.json`.
- Build requirements are governed by `character_build_spec.json`.
- Any character that looks like a generic MetaHuman but not Isabel fails acceptance.

## Saturday bring-up sequence
1. Open the project on the home AI PC.
2. Confirm GPU/VRAM and Unreal 5.7 installation.
3. Enable/verify MetaHuman, Control Rig, IK Rig, Full Body IK and Motion Warping.
4. Build the office blockout and save the POC map.
5. Create/import the first Isabel-compatible MetaHuman body/face candidate.
6. Place the character actor in the level with label `ISABEL_CHARACTER`.
7. Match face, complexion, eyes, brows, hair silhouette, jewelry and wardrobe to the locked references.
8. Run the visual acceptance checklist before animation work continues.
9. Bind the character to `metahuman_character_adapter.py`.
10. Verify body skeleton, face rig, eye aim, head aim and hand/foot IK.
11. Retarget the first motion set: idle, walk, turn, sit, stand, reach, point/present and type.
12. Connect the behavior executor to those semantic animation slots.
13. Test desk alignment, chair sitting, screen approach and pointing.
14. Connect audio-driven facial animation and lip sync.
15. Run a complete browser-to-Unreal command smoke test.

## Identity acceptance gates
Before a candidate becomes `ISABEL_CHARACTER`, verify:
- recognizable match to the approved face reference at neutral expression;
- same dark-brown loose professional updo silhouette;
- warm medium complexion and brown eyes;
- strong brows and the same overall facial proportions;
- black professional wardrobe and slim tailored silhouette;
- small hoop earrings and subtle necklace where technically practical;
- no scene-to-scene identity drift;
- no stylized/game-character appearance at the target camera distance.

## Runtime contract
The rest of the system talks to semantic actions, never to one-off animation filenames. Examples:
- `LOOK_AT_USER`
- `IDLE_WORK`
- `WALK`
- `SIT`
- `STAND`
- `POINT_PRESENT`
- `TYPE`

This lets us replace or improve animation assets without rewriting Isabel's behavior logic.

## First proof target
The first character milestone is not walking around the whole office. It is:

**Isabel sits at her real desk, idles naturally, looks from a live monitor to the user, blinks, turns her head, speaks with synchronized facial motion, then stands and walks to one defined monitor anchor.**

Once that passes, we expand the motion library and persistent autonomous office behavior.
