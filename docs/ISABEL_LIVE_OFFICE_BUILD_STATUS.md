# Isabel Live Office — Build Status

Branch: `isabel-live-office-poc`

## Architecture locked

- Browser/SSX remains the user-facing application.
- Cloudflare remains the public web/control layer.
- The home AI computer will run Unreal Engine and render the persistent 3D office.
- Pixel Streaming 2 will deliver the Unreal render to the browser over WebRTC.
- Isabel will be an independent controllable digital human inside the room, not part of a generated background image.
- Office monitors are independent exact 16:9 surfaces intended for live SSX content.

## Built in repository

- Unreal project descriptor for `SSX_Isabel_LiveOffice_POC`.
- Pixel Streaming 2, MetaHuman, Python automation, editor scripting, and modeling plugins enabled.
- Room geometry specification in centimeters.
- Automated Unreal Python blockout builder.
- Permanent screen IDs: `SCREEN_01` through `SCREEN_04`.
- Permanent desk Isabel anchor: `ISABEL_ANCHOR_DESK`.
- Permanent arrival camera: `CAMERA_ARRIVAL`.
- Home AI PC diagnostics/bootstrap PowerShell script.
- Local Pixel Streaming launch helper.
- Unreal generated directories excluded from Git.

## Saturday connection sequence

1. Run `Build/setup_home_ai_pc.ps1` on the home AI computer.
2. Record CPU, RAM and GPU results before changing graphics settings.
3. Install/open the matching Unreal Engine version.
4. Open `SSX_Isabel_LiveOffice_POC.uproject`.
5. Resolve/install any Epic-owned plugins requested by Unreal.
6. Create a blank level and run `Build/build_live_office.py` through Unreal Python.
7. Save the level as `Content/Maps/Isabel_LiveOffice_POC`.
8. Review the `CAMERA_ARRIVAL` view against the approved office reference and adjust the dimensions/spec instead of manually distorting objects.
9. Lock the room shell and four monitor transforms.
10. Add/test one genuinely live monitor surface.
11. Add a temporary MetaHuman in `ISABEL_ANCHOR_DESK` and prove idle movement plus audio-driven facial animation.
12. Package Windows build and test Pixel Streaming on localhost/LAN first.
13. Only after local stability, connect the browser-facing Cloudflare layer to the stream/control channel.

## Definition of Proof 001

Proof 001 is complete when a normal browser can show a continuously rendered office in which:

- room geometry never changes,
- the four screens remain exact and readable,
- one screen updates live,
- a seated temporary human blinks/moves naturally,
- speech drives facial movement,
- the stream remains interactive without a page reload.

## Do not do yet

- Do not finalize Isabel's face before the runtime is proven.
- Do not buy or lock into Tavus/HeyGen/Synthesia for the core runtime.
- Do not use an AI-generated office photo as the live background.
- Do not decorate the room heavily before camera/scale/screen geometry are approved.
- Do not expose the home AI computer directly to the public Internet while testing; use localhost/LAN first, then add the proper secured remote path.
