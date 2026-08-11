# SSX Brand Standard — Typography

**Status:** OFFICIAL / LOCKED  
**Decision date:** 2026-08-11  
**Official SSX typeface:** **Inter**

## Core rule

Inter is the official SSX font and is the default typeface for all SSX-branded work unless Dale explicitly changes this standard.

This applies to:

- SSX software and web applications
- Dashboards and command centers
- Living Flow
- Schedule systems
- Weather systems
- Isabel and assistant interfaces
- Project-camera interfaces
- Estimates and reports
- Documents and spreadsheets
- Presentations
- Marketing and sales material
- Signage and printed material
- Mobile and desktop interfaces
- Internal SSX tools

## Digital implementation

Use Inter as the first font in the stack:

```css
--font-ssx: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Prefer the real Inter webfont rather than relying on a system fallback. For Next.js applications, prefer `next/font/google` so Inter is optimized and self-hosted by the build. For static sites, load the official Inter webfont and retain the fallback stack above.

## Recommended SSX weight hierarchy

- 300 — large display numerals or very large secondary display text when appropriate
- 400 — body copy and standard data
- 500 — controls, data emphasis, card titles
- 600 — headings, navigation, strong labels
- 700 — critical emphasis and high-priority status text

## Brand consistency

Do not introduce a competing display font, serif, script, or decorative font into SSX-branded interfaces without an explicit new typography decision. Variations in size, weight, case, tracking, and spacing are allowed; the underlying typeface remains Inter.

**Canonical decision:** INTER IS THE OFFICIAL SSX FONT.
