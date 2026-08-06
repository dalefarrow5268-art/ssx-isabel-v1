# Isabel Live Office — Saturday First Run

Run these steps on the home AI computer in order.

1. Run `setup_home_ai_pc.ps1` from PowerShell.
2. Run `saturday_readiness_check.ps1`.
3. Fix every failed check that blocks Unreal, Git, GPU encoding, or project files.
4. Open `SSX_Isabel_LiveOffice_POC.uproject` in Unreal Engine 5.7.
5. Allow required plugins to enable and restart Unreal if requested.
6. Create a blank level.
7. Run `Build/build_live_office.py` from Unreal Python.
8. Save the level as `Content/Maps/Isabel_LiveOffice_POC`.
9. Verify the room shell, left windows, four 16:9 monitors, desk, named anchors, arrival camera, and lighting exist as independent actors.
10. Verify `CAMERA_ARRIVAL` gives the approved office composition before decorating the room.
11. Add/verify a NavMeshBoundsVolume covering all walkable office floor.
12. Add the temporary MetaHuman/character actor and label it `ISABEL_CHARACTER`.
13. Verify idle, look-at-user, stand, walk-to-screen, point, return-to-desk, and sit tests in that order.
14. Start the local Pixel Streaming signalling/frontend stack.
15. Launch the Unreal office with Pixel Streaming enabled.
16. Open the local stream in Chrome and confirm stable video and input.
17. Test the `/live-office` browser shell against the local stream endpoint.
18. Verify all four screen routes load independently and that a failed screen uses the controlled fallback state.
19. Test one full scripted interaction: arrival → look at user → listen → schedule topic → stand → walk to SCREEN_02 → speak/point → return to listening.
20. Only after the local/LAN proof passes, connect the secured external/Cloudflare-facing route.

## Do not skip

- Do not expose the Unreal machine directly to the public internet before local/LAN validation.
- Do not tune final cabinetry/materials until the room geometry and arrival camera are approved.
- Do not build the final Isabel face until the temporary character completes the movement + speech proof.
- Isabel identity must follow `isabel_identity_lock.json` and `isabel_character_acceptance.md`.
- Screens stay separate live surfaces. Never bake their text into the office background.

## Proof-001 success condition

Chrome shows a continuously rendered office. A seated woman is visibly alive, can look toward the user, speak with synchronized facial motion, stand, walk to a live schedule monitor, point, and continue listening without the office geometry changing.
