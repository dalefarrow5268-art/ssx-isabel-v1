# Isabel Live Office — Saturday Commissioning Acceptance

The goal is to bring the home AI computer online without guessing, silently changing configuration, or calling the office LIVE before the actual runtime proves itself.

## 1. Machine discovery

- Machine discovery report exists and reflects the actual PC.
- GPU is detected.
- NVIDIA driver/NVENC capability is verified where applicable.
- Unreal Engine 5.7 executable path is confirmed.
- Git, Python, browser, repository, and `.uproject` paths are confirmed.
- Required Pixel Streaming ports are available or any conflict is explicitly understood.

## 2. Canonical machine configuration

- `isabel_machine_config.json` exists.
- Repository path and branch are correct.
- Unreal editor path is correct.
- Pixel Streaming host and ports are correct.
- Web front-door/live-office URL is correct.
- Screen base URL is correct.
- State and log directories are writable.
- `external_action_replay_allowed` remains `false`.

## 3. Deterministic office assembly

- Room shell builds without error.
- Monitor wall contains four independent 16:9 screen surfaces.
- White monitor reveal is uniform and geometry-locked.
- Desk/chair interaction geometry passes clearance review.
- Window wall, glass, frames, and daylight are present.
- Tray ceiling and perimeter lighting are present.
- Flatiron frame/mat geometry is present.
- Floor/carpet and foreground seating preserve approved composition.
- `CAMERA_ARRIVAL` remains locked.

## 4. Isabel runtime

- `ISABEL_CHARACTER` exists and identity lock passes.
- Stable seated and standing desk anchors exist.
- All four screen approach anchors exist.
- User-focus target exists.
- Isabel can look at the user, stand, navigate, stop, face a screen, and sit safely.
- No teleporting is accepted as the final movement behavior.

## 5. Pixel Streaming and browser bridge

- Pixel Streaming signalling stack is running.
- Browser receives the Unreal video stream.
- Data channel handshake reaches READY.
- Heartbeats remain healthy.
- Browser command receives an Unreal acknowledgement.
- Unreal state update is returned to the browser.
- Browser refresh preserves the work session and restores stable state.

## 6. Four live screens

- All four physical monitor actors exist.
- Each screen loads its own registered route.
- One screen can fail/recover without changing the others.
- Text remains readable from the approved camera.
- No screen content is baked into an AI-generated background.

## 7. Voice and embodied interaction

- Microphone input is detected.
- User speech reaches transcript.
- Isabel begins useful response within the measured latency budget where practical.
- Audio drives lip/facial performance.
- Barge-in stops speech cleanly.
- Eye/head/body timing remains natural during listening, thinking, speaking, and interruption.

## 8. Continuity and safety

- Identity survives refresh/reconnect.
- Office geometry and camera do not drift.
- Stable posture is restored after restart; never a half-sit/half-stand pose.
- Pending approvals remain tied to exact payload hashes.
- External actions are never replayed automatically.
- Executed actions are not called verified until verification evidence exists.

## 9. First live rehearsal

Required sequence:

1. Isabel is visibly working before user arrival.
2. User arrives; eyes acknowledge first, then head/body.
3. User asks about the schedule problem.
4. Isabel identifies the schedule topic and prepares SCREEN_02.
5. Isabel stands and walks to SCREEN_02.
6. Isabel explains current schedule information with evidence/uncertainty intact.
7. User interrupts; Isabel stops naturally and listens.
8. Isabel responds to the interruption.
9. Isabel returns to the desk.
10. Isabel sits and resumes work.

## Commissioning result

**PASS** only when the live-session gate, Pixel Streaming handshake, runtime smoke test, and first live-demo rehearsal all pass on the actual home GPU machine.

Anything less is **NOT YET LIVE**, even if individual components are functioning.
