# Foresight UI component catalog

**Last reviewed:** 2026-09-23
**Project:** Foresight Monsoon, SIH26086
**Status:** Living design and implementation reference; recommendations are not installed dependencies.

## How to use this file

Use this catalog when choosing a component for the farmer journey: understand the monsoon story, find a covered district, inspect geographic context, read a forecast, and act on crop advice. Prefer clear text, familiar controls, fast loading, and touch access over effects that only make the page look technical. A map or satellite image is geographic context; it is **not** evidence of crop health or a measured local forecast in the current prototype.

For every addition, replacement, or rejection, update the entry's decision, date, reason, installed version or copied source revision, and the relevant license and asset terms. Add a new entry using the template at the end. An X post is a discovery lead, not a source of license or compatibility facts. The cited primary sources were reviewed on 2026-09-23 where accessible; unverified cases are identified in their entries. Recheck before copying code or shipping.

**Decision meanings:** **Adopt** = approved starting choice, subject to normal implementation checks; **Prototype** = compare in a small, reversible implementation; **Avoid** = unsuitable for the main farmer flow; **Unverified** = do not copy or install until source and terms are established.

## Preferred starting set

| Need | Choice | Reason |
| --- | --- | --- |
| Static action and weather icons | **Lucide React — Adopt** | Already installed; one consistent icon family. |
| Stable loading shapes | **Sync Skeleton — Adopt** | CSS only; appropriate for imagery, forecast, and advice loading. |
| Interactive map experiment | **mapcn — Prototype** | MapLibre components could replace custom map controls after tile terms and mobile performance are settled. |
| Scroll story | **Project Framer Motion effects — Adopt** | Four focused moments use the animation package already installed; external scroll components remain comparison references. |

The existing frontend uses React 19, Vite, Tailwind CSS v4, `framer-motion`, `lucide-react`, `react-simple-maps`, Recharts, and Three.js. It already has district selection and a satellite context view. Do not add a second mapping or animation stack merely because a component demo looks attractive.

## Current Foresight components

These are project components in [App.jsx](../frontend/src/App.jsx), with styles in [cinematic.css](../frontend/src/cinematic.css). They use the project's own source code; the generated scenes and Esri imagery have separate provenance and terms.

### HeroParallax — **Adopt** (2026-09-23)

- **Purpose / Foresight use:** Establish the Indian farm setting, then add gentle image depth as the visitor scrolls toward the farmer story.
- **Source / dependencies:** Project source; React and the installed Framer Motion `useScroll`, `useTransform`, and `motion` APIs.
- **License / assets:** Project code; the generated hero scene is labeled as an illustration and must not be described as observed field imagery.
- **Mobile / access:** Copy and district actions remain ordinary HTML. `useReducedMotion` removes the transform and fade.
- **Decision reason:** A focused visual entrance without hiding the way into the outlook.

### StoryChapter — **Adopt** (2026-09-23)

- **Purpose / Foresight use:** Show sowing, rain break, and heavy-rain decisions as three large image chapters with minimal words.
- **Source / dependencies:** Project source; React and installed Framer Motion. One generated Indian farming triptych supplies the chapter imagery.
- **License / assets:** Project code; generated scenes are illustrative and should retain their provenance note.
- **Mobile / access:** Text remains in document order. Reduced motion removes the image and text transforms; chapter meaning does not depend on motion.
- **Decision reason:** Replaces a dense card row with understandable farmer-life moments.

### FieldToOrbit — **Adopt** (2026-09-23)

- **Purpose / Foresight use:** Pull visually from an illustrative field scene toward geographic satellite context before the district view.
- **Source / dependencies:** Project source; React, Framer Motion, and Esri World Imagery tile requests.
- **License / assets:** Project code. Generated scene and satellite tiles have separate terms; attribution is visible in the district view. Confirm imagery usage terms before public deployment.
- **Mobile / access:** The section has an accessible label, static copy, and a reduced-motion state. Tile failure must not block navigation to district selection.
- **Decision reason:** Connects the emotional opening to the satellite-focused product concept.

### SatelliteView — **Adopt for prototype** (2026-09-23)

- **Purpose / Foresight use:** Large district-centre imagery with zoom controls and visible provider attribution.
- **Source / dependencies:** Project source; React and the current Esri imagery tile endpoint. No computer-vision layer is computed here.
- **License / assets:** Project code; Esri and contributing imagery provider terms are separate. Confirm allowed usage before public deployment.
- **Mobile / access:** Zoom buttons have labels, imagery has a text fallback, and the district selector plus advice remain usable if tiles fail. The view is a district centre, not the visitor's farm.
- **Decision reason:** Keeps satellite context visually central while the full forecast remains available below.

### IndiaReveal and IndiaMap — **Adopt for prototype** (2026-09-23)

- **Purpose / Foresight use:** Reveal national scale on scroll and select among the 74 covered districts.
- **Source / dependencies:** Project source; React, installed Framer Motion, `react-simple-maps`, and the local India TopoJSON asset.
- **License / assets:** Project code; check the geographic asset's provenance before distribution.
- **Mobile / access:** Reduced motion removes the scale reveal. The district watch list is a labeled button alternative to map markers; keep both keyboard operable.
- **Decision reason:** Moves from local to India scale without presenting a generic dashboard.

## Map and geographic context

### mapcn: map, markers, and controls — **Prototype** (2026-09-23)

- **Purpose / Foresight use:** Build a MapLibre map for a selected district, with labeled zoom and locate controls, district markers, and optional geographic overlays. It is a map UI toolkit, not a satellite imagery or computer vision source.
- **Source:** [Documentation](https://www.mapcn.dev/docs), [repository](https://github.com/AnmolSaini16/mapcn), [license](https://github.com/AnmolSaini16/mapcn/blob/main/LICENSE), [X discovery lead](https://x.com/anmold_s/status/2096586575027277926).
- **Dependencies:** MapLibre GL JS; copyable React components styled with Tailwind and shadcn conventions. Confirm each selected component's registry dependencies before installation.
- **License / assets:** Component code is MIT. The repository says its default CARTO basemap has separate terms, including a CARTO Enterprise requirement for commercial use. Select and document an authorized tile or imagery provider and attribution before deployment. Satellite tiles have their own terms.
- **Mobile / access:** Test WebGL support, data use, low-end phone performance, touch targets, zoom controls, keyboard interaction, and map attribution. Keep the district selector and text forecast usable when map tiles fail or GPS is denied.
- **Decision reason:** Strong fit for a map prototype, but current custom map and selector already work and imagery terms remain a dependency.

## Loading and progress

### Sync Skeleton — **Adopt** (2026-09-23)

- **Purpose / Foresight use:** Reserve the shape of a satellite frame, forecast summary, or advice panel while real content loads. Multiple skeletons can share a synchronized shimmer.
- **Source:** [Repository, usage, and MIT license](https://github.com/crutchcorn/sync-skeleton).
- **Dependencies:** CSS import only. This is **not itself a React component**; wrap it in project components as needed.
- **License / assets:** MIT code; no image assets required.
- **Mobile / access:** Fix placeholder dimensions to avoid jumps. Hide decorative shapes from assistive technology; expose one accurate loading status. Replace shimmer with a static state for `prefers-reduced-motion`.
- **Decision reason:** Explains loading without implying a percentage the backend cannot report.

### React Bits Lattice Loader — **Avoid for ordinary loading** (2026-09-23)

- **Purpose / Foresight use:** Could show a discrete processing state with success or error, if a future operation reports one; unnecessary for tile or forecast fetches.
- **Source:** [Component](https://reactbits.dev/micro/lattice-loader), [repository](https://github.com/DavidHDev/react-bits), [license](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md), [X discovery lead](https://x.com/davidhaz/status/2100868487631475113).
- **Dependencies:** Confirm the selected registry variant; the catalog previously showed no extra dependency for this item.
- **License / assets:** React Bits uses **MIT + Commons Clause**, which restricts selling or redistributing the components themselves. Do not call it plain MIT.
- **Mobile / access:** Check timer truthfulness, reduced motion, and live-region behavior in the exact variant. Use text to explain the task.
- **Decision reason:** A stable skeleton and truthful status are clearer for this prototype.

### ObsidianUI Jelly Loader — **Avoid** (2026-09-23)

- **Purpose / Foresight use:** Decorative loop only; no strong role in the farmer journey.
- **Source:** [Component](https://www.obsidianui.dev/docs/jelly-loader), [developer and license overview](https://www.obsidianui.dev/developers).
- **Dependencies:** Motion for React in the demonstrated component; verify the copied variant.
- **License / assets:** ObsidianUI states its component repository is MIT; third-party demo assets and packages have separate terms.
- **Mobile / access:** Continuous motion needs a reduced-motion alternative and an external loading label.
- **Decision reason:** Adds animation without telling users what is loading.

### React Loader Studio — **Unverified** (2026-09-23)

- **Purpose / Foresight use:** Possible loader source, with no defined use until an official component can be inspected.
- **Source:** [X discovery lead](https://x.com/ryaveee/status/2097269339154272617); matching official docs or repository not verified.
- **Dependencies / license:** Unknown. Do not copy or install.
- **Mobile / access:** Unknown; inspect the exact loader and reduced-motion behavior if a source is found.
- **Decision reason:** Provenance and terms are missing.

## Scroll story and image transitions

The current page uses four scroll moments built with Framer Motion: hero parallax, farmer-life image movement, field-to-satellite pullback, and India map reveal. Keep headings, imagery descriptions, and actions in normal document flow so reduced motion, slow devices, and failed JavaScript do not hide the story. The libraries below remain candidates only if a specific effect proves better in a phone prototype.

### SectionFlow — **Prototype first** (2026-09-23)

- **Purpose / Foresight use:** Connect three short farmer-life chapters through a restrained transition.
- **Source:** [Documentation](https://sectionflow.vercel.app/docs), [repository](https://github.com/MYSELF-SAYAN/sectionflow), [X discovery lead](https://x.com/itz_sayan_03/status/2091901351815237637).
- **Dependencies:** Its CLI copies source; its current repository describes the core and transitions as Framer Motion based. Inspect the selected transition before installing.
- **License / assets:** Repository states MIT. Demo media has independent terms; use generated Indian farm scenes as labeled illustrations or separately licensed photography.
- **Mobile / access:** Check the project's claimed responsive and reduced-motion behavior on the exact variant; ensure content remains readable without animation.
- **Decision reason:** Candidate for a single chapter transition, subject to a phone prototype.

### ObsidianUI Scroll Stack — **Prototype alternative** (2026-09-23)

- **Purpose / Foresight use:** Three short chapter cards that come into focus in sequence.
- **Source:** [Component](https://www.obsidianui.dev/docs/scroll-stack), [developer and license overview](https://www.obsidianui.dev/developers).
- **Dependencies:** GSAP and ScrollTrigger in the documented implementation.
- **License / assets:** ObsidianUI states MIT for its repository; review any copied demo images separately.
- **Mobile / access:** Its example uses `gsap.matchMedia()` for reduced-motion handling. Test touch scrolling, focus order, nested scroll behavior, and chapter text length.
- **Decision reason:** Strong editorial effect, but potentially heavier than ordinary page flow.

### React Bits ScrollExpand — **Prototype alternative** (2026-09-23)

- **Purpose / Foresight use:** Expand one farm or field image into a full-width chapter opener.
- **Source:** [Component](https://reactbits.dev/animations/scroll-expand), [repository](https://github.com/DavidHDev/react-bits), [license](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).
- **Dependencies:** Check the exact JS/TS and CSS/Tailwind variant; the registry previously listed no additional package for this item.
- **License / assets:** MIT + Commons Clause for code; source images need their own rights.
- **Mobile / access:** Image must not cover headings or actions. Verify reduced motion, keyboard scrolling, layout shifts, and image weight.
- **Decision reason:** Potentially simpler than stacked chapters; compare against SectionFlow.

### React Bits ScrollReveal / FadeContent — **Prototype sparingly** (2026-09-23)

- **Purpose / Foresight use:** Small heading or chapter-intro entrances, never the sole way to reveal advice or warnings.
- **Source:** [ScrollReveal](https://reactbits.dev/text-animations/scroll-reveal), [FadeContent](https://reactbits.dev/animations/fade-content), [license](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).
- **Dependencies:** GSAP is listed for the researched variants; verify the selected registry item.
- **License / assets:** MIT + Commons Clause; no demo asset grant implied.
- **Mobile / access:** Text must be visible when JavaScript fails and when reduced motion is requested. Avoid blur and letter-by-letter motion for essential text.
- **Decision reason:** Optional finishing detail after the core flow is readable.

### ObsidianUI Parallax Gallery — **Avoid for core content** (2026-09-23)

- **Purpose / Foresight use:** Decorative image gallery, not a forecast or advisory control.
- **Source:** [Component](https://www.obsidianui.dev/docs/parallax-gallery), [developer and license overview](https://www.obsidianui.dev/developers).
- **Dependencies:** GSAP and Motion for React in the documented version.
- **License / assets:** Repository states MIT; photos are separately licensed.
- **Mobile / access:** Nested scrolling, thumbnails, and many images cost bandwidth and attention. Supply meaningful image descriptions and inspect reduced-motion behavior.
- **Decision reason:** Adds friction before users reach local advice.

### ObsidianUI SVG Pixel Reveal — **Prototype only once** (2026-09-23)

- **Purpose / Foresight use:** Reveal a licensed field photograph or satellite-context image in a story section.
- **Source:** [Component](https://www.obsidianui.dev/docs/svg-pixel-reveal), [developer and license overview](https://www.obsidianui.dev/developers).
- **Dependencies:** GSAP with ScrollTrigger in the documented implementation.
- **License / assets:** Repository states MIT; image rights and satellite attribution are separate.
- **Mobile / access:** Retain descriptive alt text and the plain image under reduced motion. Check SVG filter cost on lower-end phones.
- **Decision reason:** May strengthen the visual story if it performs well; never use it to reveal a risk value.

## Buttons, input, and visual polish

### ObsidianUI Arrow Fill Button — **Prototype** (2026-09-23)

- **Purpose / Foresight use:** Main “Find my area” action, provided the text and focus state remain clear.
- **Source:** [Component](https://www.obsidianui.dev/docs/arrow-fill-button), [developer and license overview](https://www.obsidianui.dev/developers).
- **Dependencies:** `clsx`, `tailwind-merge`, component CSS, and a `cn` helper in the documented variant.
- **License / assets:** Repository states MIT; inspect the exact copied source.
- **Mobile / access:** Preserve real button or link semantics, visible focus, disabled state, touch size, and reduced-motion styling. The arrow alone must not convey the action.
- **Decision reason:** A small, contained visual upgrade if it remains clear without motion.

### Kokonut UI buttons and inputs — **Prototype individual items** (2026-09-23)

- **Purpose / Foresight use:** Look for a clearer search input or secondary action pattern; do not install the library wholesale. Its AI Voice input captures speech and is not an audio-advice player.
- **Source:** [Documentation](https://kokonutui.com/docs), [repository](https://github.com/kokonut-labs/kokonutui), [MIT license](https://github.com/kokonut-labs/kokonutui/blob/main/LICENSE), [X discovery lead](https://x.com/dorianbaffier/status/1875527854378905682).
- **Dependencies:** Tailwind v4 and shadcn conventions; individual items may need Motion, Lucide, primitives, or other packages.
- **License / assets:** MIT repository code. Check any bundled demo media separately.
- **Mobile / access:** Test labels, touch targets, keyboard input, validation, and reduced motion. Avoid particle buttons for the primary farmer action.
- **Decision reason:** Useful component source, but only if a specific item improves the existing controls.

### Magic UI Progressive Blur — **Avoid over task content** (2026-09-23)

- **Purpose / Foresight use:** Decorative fade at the edge of a gallery, not over district names, risk values, or advice.
- **Source:** [Component](https://magicui.design/docs/components/progressive-blur), [repository and MIT license](https://github.com/magicuidesign/magicui).
- **Dependencies:** Copyable React component; the documented example composes with a scroll area. Inspect the exact item before use.
- **License / assets:** MIT code; example imagery is not automatically granted.
- **Mobile / access:** It intentionally obscures content. Ensure anything underneath remains discoverable and legible.
- **Decision reason:** No current core use case.

## Icons and weather visuals

### Lucide React — **Adopt** (2026-09-23)

- **Purpose / Foresight use:** One static icon family for location, rain, listening, play/pause, navigation, and forecast states.
- **Source:** [React docs](https://lucide.dev/guide/packages/lucide-react), [repository and license](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
- **Dependencies:** `lucide-react`, already installed.
- **License / assets:** ISC for Lucide, with legacy Feather icons under the MIT notice described in the repository.
- **Mobile / access:** Pair action icons with visible words. Hide decorative SVGs from assistive technology inside labeled controls. Do not convey risk severity through icon shape or color alone.
- **Decision reason:** Already used and consistent; no new package required.

### Lucide Animated — **Prototype sparingly** (2026-09-23)

- **Purpose / Foresight use:** Animate an actual state change such as audio play/pause or successful location selection.
- **Source:** [Gallery](https://lucide-animated.com/), [repository](https://github.com/pqoqubbw/icons), [X discovery lead](https://x.com/pqoqubbw/status/2001380814429536552).
- **Dependencies:** Motion for React for researched components; verify individual icon requirements.
- **License / assets:** Project states MIT; the underlying Lucide glyph license remains relevant.
- **Mobile / access:** Hover alone is insufficient. Check touch activation, keyboard focus, reduced motion, and a visible text label.
- **Decision reason:** A few meaningful state cues may help; an animated icon system throughout the page would distract.

### Iconimate — **Prototype only if switching icon family** (2026-09-23)

- **Purpose / Foresight use:** Animated Phosphor-style icons for a few state changes.
- **Source:** [Gallery](https://iconimate.app/), [repository](https://github.com/smammar100/Iconimate), [X discovery lead](https://x.com/Ammar110_SM/status/2078451846172279064).
- **Dependencies:** Motion for React for copied icons.
- **License / assets:** Repository states MIT for Iconimate and included Phosphor glyphs; retain applicable notices.
- **Mobile / access:** Repository describes hover, focus, and imperative touch triggers; check reduced motion per copied icon and keep labels.
- **Decision reason:** Do not mix Phosphor and Lucide styles casually; Lucide is the current default.

### AI-generated agriculture icons — **Prototype as original design assets** (2026-09-23)

- **Purpose / Foresight use:** Fill gaps for locally meaningful sowing, irrigation, crop-stage, or monsoon concepts that generic icon sets do not explain well.
- **Source:** Original generated concept plus manually reviewed final SVG; record prompt, creator, revision, and any generator terms when produced.
- **Dependencies / license:** None until assets exist; record their actual provenance and usage rights per asset.
- **Mobile / access:** Normalize stroke and grid, check contrast at small size, test recognition with Indian users, and pair each symbol with text.
- **Decision reason:** Useful only when it communicates a real task more clearly than Lucide.

## Other discovered effects and sources

### Canvas UI Particle Reveal — **Avoid in main flow** (2026-09-23)

- **Purpose / Foresight use:** Decorative hero effect, not weather or computer vision evidence.
- **Source:** [Component collection](https://canvasui.dev/components), [site and terms](https://canvasui.dev/), [X discovery lead](https://x.com/davidhaz/status/2080224101432447094).
- **Dependencies:** Component-specific WebGL or WebGPU stack; inspect exact source before any experiment.
- **License / assets:** Site states MIT + Commons Clause; inspect the selected component and media terms.
- **Mobile / access:** GPU demand, browser support, reduced motion, and fallback behavior need explicit testing.
- **Decision reason:** Weak fit for a low-bandwidth farmer path.

### Aceternity Sticky Scroll Reveal — **Avoid for farmer story** (2026-09-23)

- **Purpose / Foresight use:** Sticky visual next to scrolling explanatory text.
- **Source:** [Component](https://ui.aceternity.com/components/sticky-scroll-reveal), [registry](https://ui.aceternity.com/registry/sticky-scroll-reveal.json).
- **Dependencies:** Motion for React in the provided source.
- **License / assets:** Exact reuse terms for this free source remain unverified; the [paid-item license page](https://ui.aceternity.com/licence) does not settle them.
- **Mobile / access:** Its nested fixed-height scroll area and hidden visual panel on smaller screens weaken the intended phone story. Reduced-motion handling requires inspection.
- **Decision reason:** Poor mobile fit and unclear source terms.

### Aceternity Cloud Shader — **Avoid as data display** (2026-09-23)

- **Purpose / Foresight use:** Decorative sky only, never a current forecast indicator.
- **Source:** [Component](https://ui.aceternity.com/components/cloud-shader), [X discovery lead](https://x.com/mannupaaji/status/2088657754345050601).
- **Dependencies / license:** Inspect exact registry source and reuse terms before any experiment; neither is established here.
- **Mobile / access:** Check GPU use and reduced motion. Procedural clouds must not imply measured weather.
- **Decision reason:** Risks making decoration look like real meteorological evidence.

### Designeer — **Unverified** (2026-09-23)

- **Purpose / Foresight use:** Potential component inspiration; no component has been selected.
- **Source:** [Website supplied by the team](https://designeer.xyz/). On 2026-09-23 it returned Cloudflare Error 1027 (temporary rate limit) to both the browser and command-line request.
- **Dependencies / license:** Unknown. Do not copy or install until the site or an official repository is accessible and an individual component is identified.
- **Mobile / access:** Unknown; inspect the exact component before recommending it.
- **Decision reason:** Cannot verify its catalog or terms yet.

## Asset and data boundaries

- **Generated Indian farm scenes** may set the tone of the landing page. Label them as illustrations when context could otherwise imply documentary photography. Do not present them as local satellite or computer vision observations.
- **Satellite imagery and basemaps** require a named provider, permission for the intended use, attribution, and a fallback. A component library's MIT license does not grant tile or image rights.
- **Forecast, crop advice, and risk colors** must come from the application's data and existing design tokens. Decorative clouds, particle effects, or satellite colors are not forecast measurements.
- **Indian flags and symbols** should be used only where they communicate India-level context, not as a substitute for district location or weather meaning.

## Acceptance checks before adopting a prototype

1. At a phone sized viewport, can a user select a covered district, read the forecast, and act on advice without guessing what an icon means?
2. With reduced motion enabled, are all chapter text, controls, map alternatives, and warnings available in the same order?
3. With JavaScript unavailable or map tiles blocked, is the story readable and is there a plain district-selection and advice path where the app's data can still load? If the current React app cannot load without JavaScript, record that product limitation rather than claiming a working no-JS forecast.
4. With GPS denied or slow imagery, can the user choose a district manually and understand that imagery is geographic context?
5. Is every copied component's exact source, version or commit, dependency list, license, and third-party media or tile attribution recorded?
6. Does the effect perform acceptably on a lower-end phone and a constrained connection? Remove it if it delays the primary location and advice flow.

## Entry template

```md
### Component name — **Adopt | Prototype | Avoid | Unverified** (YYYY-MM-DD)

- **Purpose / Foresight use:** What user task it improves and where.
- **Source:** Official docs, repository, exact component, and discovery lead if relevant.
- **Dependencies:** Exact selected variant and packages; installed version or copied commit once used.
- **License / assets:** Code license and separate image, icon, map tile, or font terms.
- **Mobile / access:** Touch, keyboard, labels, reduced motion, loading and failure behavior.
- **Decision reason:** Evidence for the decision; update when replacing or rejecting.
```
