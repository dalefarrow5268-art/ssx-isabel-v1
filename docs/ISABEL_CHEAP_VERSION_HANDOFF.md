# Isabel V1 handoff for cheaper build attempt

Date: 2026-08-05  
Project: SSX Isabel V1  
Live preview: https://ssx-isabel-v1.sub-source-e-9730.chatgpt.site

## Why this handoff exists

We burned too many credits iterating visually. This file is meant to let a cheaper model or another coding session continue from the current state without rediscovering everything.

The most important correction from Dale:

Isabel should not be stuck in a window, sidebar, or dashboard. The screen should become her SSX office/control center. She should move around inside that office, work before the user arrives, notice when the user enters, and interact with office rooms, boards, desks, and tools.

## Current live state

The hosted preview currently shows a dark, grid-like “office mode,” but Dale correctly said it still does not really look like an office. It is only a starting point.

Current live URL:

https://ssx-isabel-v1.sub-source-e-9730.chatgpt.site

Current site checkout in the Codex workspace:

`/workspace/sites/ssx-isabel-v1`

Most important files:

- `app/page.tsx`
- `app/globals.css`
- `public/isabel-portrait.jpeg`
- `public/isabel-reference.jpeg`
- `.openai/hosting.json`

Current Sites project:

- Title: SSX Isabel V1
- Slug: ssx-isabel-v1
- Latest deployed concept: office mode with weather board and room map

Do not expose private opaque IDs to the user unless needed by tooling. The site already has a live URL.

## What Isabel is supposed to become

Isabel is not just an AI chat interface. She is intended to become SSX’s owned AI assistant experience.

Core concept:

- SSX owns the “Scout Engine.”
- Scout Engine includes personality, memory, evidence, and operational intelligence.
- Isabel is the visible embodied assistant/personality that uses Scout Engine.
- Isabel’s design/personality work should remain cleanly separate from backend memory/scout work, but everything should eventually feed her memory.

User’s direct requirements:

- “She is not to be stuck in a window eventually.”
- “The screen should be an office she is moving around in.”
- “She should be in a room walking around, doing things, then noticing the user joined.”
- “Maybe different rooms too if needed.”
- “Weather board we talked about.”

## Visual direction Dale liked

Dale liked the reference direction of:

- modern executive operations control center
- construction project control room
- futuristic AI assistant office command center
- dark glass
- warm gold SSX lighting
- large video wall
- control-center / executive office hybrid
- screens and boards mounted in believable places

The current build is not there yet. It looks too much like floating flat boxes on a grid. The next attempt should prioritize architectural believability before adding more features.

## Research/design principles already agreed

Use real control-room logic:

- sightlines matter
- big wall displays belong on walls
- work zones should map to physical places
- lighting should reduce glare
- operator/control rooms use zones: situation wall, work desk, decision/authority area, audit/history board
- construction dashboards should focus on schedule, cost, site risk, RFIs, weather, safety, and field confirmation

But the final Isabel UI should feel like an office first, not a generic dashboard.

## Better target layout

Think of the screen as a camera looking into Isabel’s SSX office.

Suggested room:

1. Back wall:
   - large SSX command wall
   - project map
   - weather/radar board
   - evidence wall
   - schedule strip

2. Left side:
   - doorway / entry area
   - user enters from here
   - Isabel notices and turns toward the user

3. Center:
   - Isabel walks around
   - visible floor, shadows, furniture, depth
   - central table or desk where she reviews project work

4. Right side:
   - memory vault / private cabinet / secure glass room
   - authority table where approvals happen

5. Foreground:
   - low console or desk controls
   - not a giant blocking dashboard
   - should feel like the user is standing at a counter in her office

6. Future rooms:
   - Control Center
   - Weather Room
   - Drafting Room
   - Memory Vault
   - Meeting Room
   - Project War Room

## Current interaction model to preserve

Current stations:

- Briefing
- Weather
- Draft
- Confirm
- Memory
- Activity

These are currently rendered as buttons and content panels. In the next design they should become physical places or boards in the office.

Suggested mapping:

| Current station | Physical office object |
| --- | --- |
| Briefing | evidence wall / morning board |
| Weather | weather board / radar wall |
| Draft | writing desk |
| Confirm | authority table |
| Memory | memory vault / secure room |
| Activity | audit board / event timeline wall |

## Weather board requirements

Dale specifically reminded: “weather board we talked about.”

Weather should not be a generic weather app. It should be an operations risk board.

Weather board should show:

- Isabel Tower / project site
- radar or map-like display
- tomorrow AM rain risk
- exterior work exposure
- lift/glazing wind concern
- confidence state
- “field impact not confirmed”
- next action: ask Carlos for alternate exterior sequence before afternoon meeting

Correct tone:

“Weather is a watch item, not a delay yet.”

Current weather example data:

- Rain risk: 64%
- Wind: 18 mph gusts
- Exterior storefront work may need resequencing
- Carlos must confirm actual site impact before escalation
- Confidence: blocked until field read

## Isabel behavior requirements

The room should feel alive.

Before user enters:

- Isabel is already working
- pacing between evidence wall and desk
- sorting weather/evidence
- maybe leaning over desk or looking at wall

When user enters:

- she notices
- turns toward user
- pauses work
- greeting changes from “She is already working” to “She noticed you walk in”
- office lights or user indicator can react

When selecting stations:

- Isabel moves to that physical station
- weather = she walks to weather board
- draft = she walks to desk
- memory = she goes to secure memory room/vault
- confirm = she stands at authority table
- activity = she stands near audit wall

Avoid:

- Isabel trapped in portrait
- floating widgets with no architecture
- grid floor with boxes only
- huge lower dashboard covering the room

## Current project code concept

Current `page.tsx` is a single React client component with local state:

- `station`
- `tone`
- `confirmed`
- `memory`
- `entered`
- `focusedEvidence`

Current code uses arrays for:

- evidence
- briefing
- tone variants
- weather
- activity

This simple model is fine for now. Keep it. Focus on redesigning layout and CSS.

## Recommended next coding step

Do one large visual pass, not many tiny publishes.

Priority:

1. Replace flat grid with a believable room shell:
   - back wall
   - side walls
   - floor perspective
   - ceiling lights
   - doorway
   - desk/table
   - wall-mounted screens

2. Make station elements look mounted or physical:
   - weather board as wall screen
   - evidence board pinned/wall-mounted
   - memory vault as cabinet/side room
   - authority table as real table

3. Reduce giant lower panel:
   - turn it into a foreground console/counter
   - keep content readable
   - don’t cover too much of the room

4. Improve Isabel:
   - current image is a portrait crop
   - acceptable as placeholder
   - eventually need full-body animated character or generated office scene assets
   - for now, use CSS positioning and a framed vertical figure

5. Add room navigation idea:
   - current room map is okay as a small indicator
   - future should let user move to different rooms

## Build and deploy notes

If working in the existing Sites checkout:

1. Use the existing checkout:

`/workspace/sites/ssx-isabel-v1`

2. Build:

`npm run build`

3. If using Sites tools, use the Sites workflow because `.openai/hosting.json` exists.

4. Current live URL after deployment:

https://ssx-isabel-v1.sub-source-e-9730.chatgpt.site

## How to connect to the server / hosted preview

The simple user-facing way:

Open:

https://ssx-isabel-v1.sub-source-e-9730.chatgpt.site

If you are in a Codex/Sites-capable environment:

- open the existing site checkout at `/workspace/sites/ssx-isabel-v1`
- inspect `.openai/hosting.json`
- use the Sites edit/checkpoint workflow
- build with `npm run build`
- deploy/checkpoint only after a meaningful batch

If you are in a cheaper chat model without tools:

- paste this handoff
- paste the current `app/page.tsx` and `app/globals.css`
- ask it to redesign the CSS/structure for a believable executive operations office
- do not ask it to deploy
- bring the result back to a tool-enabled model only when ready to build/publish

## Cost-control instructions for future model

Dale is worried about credits. Follow this:

- Keep progress notes minimal.
- Do not research repeatedly.
- Do not publish every small edit.
- Do not keep asking clarifying questions unless truly blocked.
- Do a big local pass, build once, then show one summary.
- Focus on architecture and room believability first.
- Avoid overengineering backend until the visual direction is accepted.

## Exact next prompt for cheap version

You can paste this into the cheaper model:

“We are building Isabel, SSX’s AI assistant. She should not be trapped in a dashboard window. The full screen should look like her executive SSX office/control center. She moves around the room, works before the user arrives, notices when the user enters, and uses physical room objects: weather board, evidence wall, writing desk, authority table, memory vault, and audit board. The current version looks like flat UI boxes on a grid and needs to look like a real dark-glass executive office/control center. Redesign the React/CSS structure to create believable room architecture: back wall, side walls, floor perspective, ceiling lights, doorway, central desk/table, wall-mounted screens, and foreground console. Keep existing stations and interactions, but make them feel embedded in the room.”

## Final reminder

The goal is not “better dashboard.”

The goal is:

The user walks into Isabel’s SSX office.
Isabel is already working.
She notices them.
Then she helps run the project.

