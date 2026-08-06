# Isabel Live Office — Saturday Pass/Fail

PASS only when all of these are true:

- Home AI PC readiness report has no blocking hardware/software failure.
- Unreal Engine 5.7 opens SSX_Isabel_LiveOffice_POC.uproject.
- Master office assembly completes without exception.
- CAMERA_ARRIVAL exists and matches the locked camera spec.
- SCREEN_01 through SCREEN_04 exist as separate 16:9 surfaces.
- White monitor reveal is uniform and cabinetry does not overlap screen faces.
- Window wall is straight and stable.
- Tray ceiling and perimeter lighting actors exist.
- Desk center remains open with correct Isabel leg clearance.
- ISABEL_CHARACTER exists at a stable desk state.
- All named movement anchors exist.
- Runtime smoke test completes.
- Pixel Streaming endpoint opens in Chrome.
- Browser commands reach the office bridge.
- One live screen route is visible in the 3D office.
- Isabel can execute LOOK_AT_USER.
- Isabel can execute STAND_FROM_DESK.
- Isabel can execute GO_TO_SCREEN_02.
- Isabel can execute SIT_AT_DESK.
- Office geometry remains unchanged throughout the motion test.

If any item fails, fix that layer before visual polishing.
