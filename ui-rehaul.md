# Foresight frontend rehaul

**Date:** 2026-09-23
**Project:** SIH26086 · Hyperlocal Monsoon Onset & Break Prediction
**Status:** Working design brief for the current frontend implementation

## Product intent

Make Foresight feel like a field-to-satellite monsoon tool built for Indian farmers and planners. The first screen should establish trust and purpose through an Indian farming scene. Scrolling should explain three decisions farmers face—when to sow, how to handle a rain break, and how to prepare for heavy rain—then move into a local aerial view and finally an India-level view. The interface must remain useful to someone unfamiliar with probability charts or climate acronyms.

### Primary audience and tasks

1. **Farmer or local advisor:** Find a covered district using a name or GPS; understand the current risk in plain language; read one crop action in English or Hindi.
2. **District planner:** Compare local conditions with the national picture; identify districts to inspect; understand which signal and time horizon the prototype shows.
3. **SIH judge or researcher:** See the satellite-led concept and trace the difference between geographic imagery, prototype forecast output, and the real rule-based advisory layer.

### Success criteria

- A first-time visitor can reach a district outlook from the hero without needing to understand a map.
- The selected district, date/horizon, risk, probabilities, and recommended action are visible together on a phone.
- GPS denial, tile failure, and slow data do not block manual district selection or advice.
- The local-to-India progression feels geographic, with imagery and maps as substantial surfaces rather than tiny dashboard cards.
- Generated scenes clearly read as illustrations; satellite imagery is labeled as reference imagery, not crop-health or computer-vision evidence.
- Keyboard access, visible focus, reduced motion, and English/Hindi advice work throughout the flow.

## Experience map

| Stage | Visitor sees | Primary action | Data truth |
| --- | --- | --- | --- |
| Arrival | Original Indian farm scene, short monsoon promise, clear navigation | Explore a district or use GPS | Editorial illustration only |
| Farmer life | Sowing, dry spell, and heavy-rain moments, each tied to a practical decision | Continue to local view | Educational content, not a live alert |
| Local view | Large aerial image centered on selected district; simple location controls; risk and crop action | Read advice, change district or language | Imagery is context; forecast is prototype model output; advice is rule based |
| Outlook | 7–30 day probability trend and explanation of increasing uncertainty | Inspect trend | Prototype forecast output |
| India view | India geography with selectable covered districts and a short watch list | Open a district | Prototype coverage, not all Indian districts |
| Climate context | ENSO/IOD/MJO explained after the actionable content | Learn why the outlook changes | Climate context returned by API |

The location flow must not require GPS. GPS chooses the nearest **covered district**, which may not be the visitor's actual district or field; say this explicitly. Do not present district-centre imagery as a precise view of the visitor's farm.

## Visual and interaction direction

- **Art direction:** Monsoon landscape, soil, rice and other Indian crops, tactile paper and atlas cues, restrained satellite overlays. Use real place names and Hindi where supported by the advisory data. Avoid foreign farming imagery and generic analytics-dashboard chrome.
- **Layout:** Full-screen editorial hero; three generous story chapters; a large map or imagery canvas with the forecast alongside or beneath it; national map as a second geographic scale. On phones, the location control and action lead, then imagery, then detail.
- **Typography:** A readable display serif for narrative headings and a plain sans-serif for tasks and data. Body copy remains legible at small phone widths; abbreviations get explanations.
- **Color:** Deep monsoon green and warm field neutrals, with existing risk tokens preserved for meaning. Risk is always named in text; color alone never carries it.
- **Motion:** Four purposeful scroll moments: hero parallax, farmer-life image movement, field-to-satellite pullback, and an India map reveal. Use the already installed Framer Motion rather than stacking animation libraries. Keep normal document flow and visible content as the baseline; respect `prefers-reduced-motion`.
- **Controls:** Visible labels on buttons and icons, generous touch targets, familiar district select/search, explicit GPS status, clear back-to-local links, and keyboard-operable map alternatives.
- **Loading:** Reserve image and forecast space with quiet skeletons or static placeholders; say what is loading. Avoid theatrical spinners and invented progress percentages.

## Assets and components

- Generated Indian-themed farm scenes live at `frontend/public/indian-farm-hero.webp` and `frontend/public/indian-farm-stories.webp` (created with imagegen on 2026-09-23, then converted to WebP for delivery). They are illustrations, not local evidence. Keep Indian flags or national symbols limited to India-level context where useful.
- Use Lucide as the static icon family already in the project. Consider custom agricultural symbols only when a labeled generic icon is inadequate.
- Treat mapcn as a **prototype candidate**, not an automatic replacement. Its default CARTO tiles have separate terms, and a satellite provider needs its own usage rights and attribution. The existing district selector remains the fallback.
- Compare SectionFlow, ObsidianUI Scroll Stack, and React Bits ScrollExpand at phone width and reduced motion; adopt no more than one. Their dependencies and terms are recorded in [the component catalog](docs/ui-component-catalog.md).
- Designeer remains an unverified source until its site or an official repository is accessible.

## Implementation approach

1. **Foundation:** Keep the current React/Vite app and existing API shapes. Organize the page into clear semantic sections and reusable components as the redesign grows. Align the visual tokens and responsive rules; avoid adding a second theme system.
2. **Story:** Replace the current foreign-looking hero asset with original Indian scenes. Make each farmer-life section concrete and short. Place a district action near the hero and after the story.
3. **Local intelligence:** Keep manual selection, search, and GPS. Make imagery the dominant geographic canvas while locating risk, horizon, and crop action where they can be read together. Show tile failure and data failure separately; never imply imagery generated the forecast.
4. **Scale change:** Provide a clear route from local imagery to the India map, with covered districts visibly distinguished. Selecting a district returns to its local outlook.
5. **Evidence and advice:** Keep the existing forecast and advisory endpoints. Lead with one district signal and this week's crop action; place the full probabilities and chart in an expandable section. Retain the English/Hindi switch and rule-based advisory text.
6. **Polish:** Add only selected components from the catalog after the task flow works. Recheck component source, license, motion, and mobile cost when copied into the project.

## Data and content constraints

- The backend currently generates **mock forecast output** for the model interface. Do not label any result as a trained model prediction until real inference is wired.
- The advisory engine is real rule-based code. Its language and crop actions should be shown without changing the API contract.
- The current India map displays 74 curated agricultural districts, not complete national coverage. Avoid claims of every Indian district or field precision.
- Current aerial tiles are geographic reference imagery. They do not contain computed NDVI, vegetation stress, flood detection, or other computer-vision layers. Future layers need a named data source, date, legend, and method before being added.
- Keep provider attribution visible. Before public deployment, confirm the imagery and tile provider permits the intended traffic and use.

## Verification and acceptance

1. **Phone flow:** At approximately 390 px width, navigate hero → district → forecast/action → India → another district without horizontal overflow or tiny targets.
2. **Fallbacks:** Deny GPS, block imagery, and simulate an API failure. Manual selection remains available; imagery and forecast errors are distinct; no blank panels or misleading stale advice.
3. **Access:** Tab through navigation, selector, language switch, map alternative, and watch list. Verify focus, labels, sensible heading order, and reduced-motion behavior.
4. **Content:** Confirm the scene is Indian, the generated asset is not described as observed evidence, the prototype badge is visible, and dates and probabilities match API values.
5. **Technical:** `npm run build` succeeds; backend health responds; browser has no runtime error overlay or broken navigation. Check a lower-end mobile profile for image weight and animation cost.

## Decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-09-23 | Keep the existing API contract and 74-district coverage | Frontend work should not blur the current mock/real data boundary. |
| 2026-09-23 | Lead with Indian farm life, then local aerial context, then India | Matches the intended field-to-satellite story and gives farmers a clear entry point. |
| 2026-09-23 | Use Lucide by default and keep mapcn as a separate map experiment | Keeps the interface coherent while imagery licensing is reviewed. |
| 2026-09-23 | Label generated scenes, imagery, and prototype forecasts separately | Prevents decorative visuals from appearing to be measured local evidence. |
| 2026-09-23 | Reduce prose and use four Framer Motion scroll moments | The earlier card layout still read like a dashboard; the farmer story now leads visually. |
| 2026-09-23 | Collapse the detailed forecast under the local action | Keeps the first local view focused while preserving access to the 30-day data. |

Update this log when a visual or component choice changes, and update the matching entry in `docs/ui-component-catalog.md`.
