# LightFlux Landing Page Research And Delivery Plan

## Goal

Build a public LightFlux marketing site that explains the product, demonstrates
real workflows, routes users to the Web app, and offers only downloads that are
actually available.

The reference is the information architecture and conversion flow of:

- <https://dida365.com/>
- <https://dida365.com/features>
- <https://dida365.com/download>
- <https://dida365.com/upgrade>
- <https://help.dida365.com/>

The implementation must not copy Dida365 text, screenshots, illustrations,
logos, testimonials, awards, or visual identity.

## Reference Findings

### Site architecture

Dida365 separates each user intent into a dedicated page:

- Home: positioning, product proof, selected capabilities, platform coverage,
  social proof, and repeated conversion actions.
- Features: detailed capability education grouped by user job.
- Download: one clear action per platform, plus a Web entry.
- Premium: plan summary, detailed comparison, FAQ, and final purchase action.
- Help: search-first documentation, feature categories, tutorials, and contact.
- Footer support: product, help, resources, team, legal, language, and social
  destinations.

This separation is more useful than placing every feature on one oversized
home page. The home page creates interest; the deeper pages answer specific
questions.

### Home-page sequence

The current Dida365 home page uses this order:

1. Compact navigation with Features, Download, Premium, Help, Login, and a
   free-account action.
2. Product promise, short supporting copy, primary start action, secondary
   download action, and a large real-product screenshot.
3. Trust signals below the first product image.
4. Five scenario-led capability blocks: tasks, calendar, focus, habits, and
   milestones.
5. A large tabbed product demonstration.
6. A separate AI section.
7. A compact grid of secondary capabilities.
8. A cross-platform device section with another download action.
9. Media and user proof.
10. A final conversion section and a broad footer.

The strongest pattern is repeated use of real UI and actual product states.
Decorative illustration is secondary to showing what the application does.

### Feature-page taxonomy

The reference feature page groups capabilities into:

- Fast capture.
- Task organization.
- Reminders.
- Calendar planning.
- Multiple views.
- Time-management tools.
- Secondary and integration features.

Each group uses one concise promise, a small number of feature details, and a
large product visual. The page is organized around user outcomes rather than
the application's component hierarchy.

### Download-page behavior

The reference page exposes:

- Web.
- iOS and iPadOS.
- Android.
- HarmonyOS.
- Windows.
- macOS.
- Linux.
- Browser or service plugins.

Mobile platforms use QR-based handoff. Desktop platforms use direct downloads
and optional system-specific details. A large device composition confirms that
the product experience is shared across platforms.

### Premium and help pages

The Premium page contains:

- Free and paid plan summaries.
- Price and primary upgrade action.
- Full feature comparison grouped by capability.
- Purchase FAQ.
- Final upgrade action.

The Help Center contains:

- Global documentation search with a keyboard shortcut.
- Feature-guide categories.
- Highlighted tutorials.
- Contact entry.

LightFlux should reserve these information-architecture slots, but must not
publish pricing, paid limits, testimonials, media quotes, or support promises
before they are real.

### Responsive and visual behavior

- Desktop navigation is a restrained horizontal bar.
- Mobile navigation collapses to logo plus menu icon.
- The hero remains centered and keeps both actions visible on a 390px viewport.
- Desktop feature sections alternate copy and real product media.
- Mobile sections stack into one reading flow.
- The download page turns a broad platform row into one primary download
  action plus a "more platforms" path on mobile.
- Product screenshots use stable frames and aspect ratios, avoiding layout
  shifts while assets load.

## LightFlux Positioning

The public site should lead with what is already differentiated and true:

- Local-first: usable without an account, with immediate local updates.
- Optional cloud continuity after sign-in.
- Compact Today and Groups workflows with subtasks and reorder previews.
- Calendar planning and date-specific task creation.
- Rich task details with text, images, code blocks, and autosave.
- Search across titles, notes, and groups.
- Milestones and countdowns with solar/lunar support.
- Historical statistics based on task events.
- Controlled AI actions with preview, confirmation, audit, and undo.
- Web and desktop clients from one consistent product system.

Suggested message direction:

- Brand signal: `LightFlux / 流光`.
- Literal promise: `把今天，安排得刚刚好`.
- Supporting copy: local-first planning that works immediately, stays useful
  offline, and adds sync only when the user wants it.

Do not claim collaboration, voice capture, habit tracking, Pomodoro, app-store
availability, user counts, awards, media recommendations, or paid-plan value
until those capabilities and evidence exist.

## Proposed Public Routes

### Initial release

- `/`: home and primary conversion page.
- `/features`: detailed, outcome-led feature education.
- `/download`: Web and verified desktop downloads.
- `/help`: initial documentation index and FAQ.
- `/privacy`: privacy policy.
- `/terms`: terms of service.
- `/changelog`: releases and meaningful product updates.

### Existing app destinations

- `Open Web App`: route to the production application.
- `Sign in`: route to the application's `/login`.

### Deferred

- `/pricing`: add only after plans, billing, entitlements, refund rules, and
  support policy exist.
- `/education`, `/gift`, `/press`, and `/about`: add only when corresponding
  programs and content exist.

## Hosting And Domain Decision

The first version stays in the existing Expo Router Web build:

- `lightflux.site/` serves the public home page.
- Marketing routes and application routes share one deployment.
- `/today` remains the Web application entry.
- `/login` remains the authentication entry.
- Marketing routes render only in a normal Web browser. Native and Tauri root
  launches continue to redirect to `/today`.
- Existing Nginx SPA fallback, API proxy, and deployment workflows remain
  unchanged.

This is the lowest-risk option for the current stage and avoids Vercel, domain
migration, cross-origin authentication, and duplicate design systems. A
separate statically rendered marketing application remains an option if SEO,
editorial content, or independent release cadence later justify it.

## Current Download Readiness

The latest public desktop release is:

- `desktop-v1.0.0`
- <https://github.com/little1d/LightFlux/releases/tag/desktop-v1.0.0>

Published downloadable installers currently include:

- macOS Apple Silicon DMG.
- macOS Intel DMG.
- Windows x64 installer.

Important gaps:

- The current workflow contains a Linux AppImage/deb job, but the latest public
  release does not contain Linux assets.
- `docs/desktop-release.md` still says Linux is excluded and is inconsistent
  with the workflow.
- macOS uses ad-hoc signing and Windows is unsigned, so broad public download
  promotion would expose Gatekeeper or SmartScreen warnings.
- iOS and Android applications are not yet published to public stores.

The download page must derive the latest version and asset URLs from the main
repository's public GitHub Release instead of hard-coding versioned filenames.
Unsupported platforms should be marked honestly as unavailable or coming
later.

## Proposed Home Page

1. Header
   - LightFlux logo and wordmark.
   - Features, Download, Help.
   - Sign in.
   - Primary `Open Web App` action.
   - Mobile menu with the same destinations.
2. Hero
   - `LightFlux / 流光` as the first viewport brand signal.
   - Literal planning promise, concise local-first explanation.
   - `Open Web App` and `Download` actions.
   - Real desktop application screenshot with a visible hint of the next
     section.
3. Product principles
   - Local-first.
   - Works without an account.
   - Optional secure sync.
   - Cross-platform continuity.
4. Core workflows
   - Today and quick capture.
   - Groups, subtasks, and ordering.
   - Calendar planning.
   - Rich task details.
   - Milestones and countdowns.
5. AI section
   - Show the actual understand, preview, confirm, execute, audit, and undo
     workflow.
   - Avoid technical model terminology in primary copy.
6. Search and statistics
   - Global search.
   - Historical completion and workload insights.
7. Platform section
   - Web, macOS, and Windows as currently verified.
   - Linux only after a public artifact exists.
   - iOS/Android shown only as development targets until store links exist.
8. FAQ
   - Local data behavior.
   - Whether an account is required.
   - What syncs.
   - Supported platforms.
   - AI data mutation safeguards.
9. Final action and footer
   - Open Web App.
   - Download.
   - Product/help/legal/language columns.

## Proposed Features Page

Organize the page by user outcome:

1. Capture and Today
   - Quick creation.
   - Keyboard workflow.
   - Immediate local updates.
2. Organize complex work
   - Groups.
   - Subtasks.
   - Sibling-scoped drag ordering.
   - Priorities and scheduling.
3. Plan with time
   - Calendar.
   - Date-specific creation.
   - Milestones and countdowns.
4. Keep useful context
   - Rich text.
   - Images and code blocks.
   - Autosave.
5. Find and review
   - Global search.
   - Completed archive.
   - Task-event statistics.
6. Work across devices
   - Local-first storage.
   - Optional sign-in.
   - Revision-based conflict recovery.
7. Use AI with control
   - Disambiguation.
   - Preview and confirmation.
   - Audit and undo.

Every major section requires a real LightFlux screenshot or short product
recording that demonstrates the stated behavior.

## Proposed Download Page

- Detect the visitor's desktop platform, but keep all available platforms
  reachable.
- Primary options:
  - Open Web App.
  - macOS Apple Silicon.
  - macOS Intel.
  - Windows x64.
- Show version, file type, approximate size, architecture, and release notes.
- Fetch latest release metadata at build time from the public GitHub release
  repository.
- Link to the GitHub release as a reliable fallback.
- Add checksum/signature information when it is useful to end users.
- Explain unsigned-build warnings until signing and notarization are complete.
- Add Linux only after a release contains verified AppImage/deb assets.
- Add App Store and Google Play buttons only after real public listing URLs
  exist.

## Asset Plan

Required original LightFlux assets:

- Desktop Today overview.
- Desktop split-pane task detail.
- Desktop Calendar.
- Desktop Groups with nested tasks.
- Desktop AI preview/confirmation.
- Mobile Today.
- Mobile task action sheet.
- Mobile Calendar.
- Mobile Settings drawer.
- Milestone editor.
- Statistics view.
- Device composition built from real screenshots.
- Logo, wordmark, favicon, social preview, and app icons.

Use deterministic demo data with no personal information. Capture both Chinese
and English only if the initial site launches bilingually. Do not use
placeholder images.

## SEO And Measurement

- Unique title and description per route.
- Canonical URLs, robots.txt, sitemap.xml, favicon, and social preview images.
- `SoftwareApplication`, `Organization`, `WebSite`, and appropriate `FAQPage`
  structured data.
- Semantic heading order and descriptive image alt text.
- Vercel Analytics or another privacy-conscious analytics tool.
- Track only meaningful conversion events:
  - Open Web App.
  - Sign in.
  - Download by platform.
  - Feature-to-download navigation.
- Performance targets:
  - Lighthouse Performance, Accessibility, Best Practices, and SEO >= 90.
  - No horizontal overflow at 390, 402, 768, 1024, and 1440px.
  - Stable hero and device media dimensions.
  - Responsive images and lazy loading below the fold.

## To-Do List

### P0 - Product and release decisions

- [x] Keep marketing and app routes in the existing Expo Web deployment.
- [x] Launch the first marketing version in Chinese.
- [x] Route primary Web actions to `/today` and sign-in actions to `/login`.
- [x] Advertise Web, macOS, and Windows as currently available.
- [x] Disclose the unsigned desktop status instead of hiding it.
- [ ] Reconcile Linux workflow support with `docs/desktop-release.md`.
- [ ] Define privacy, terms, support email, and data-handling copy owners.
- [x] Explicitly defer pricing until billing and entitlements exist.

### P1 - Marketing application foundation

- [x] Add Web-only public routes to the existing Expo Router application.
- [x] Keep native and Tauri root launches routed to the task application.
- [x] Define LightFlux marketing tokens for type, spacing, color, media frames,
  focus, motion, and breakpoints.
- [x] Build the shared header, mobile menu, and footer.
- [x] Build shared CTA, platform badge, product preview, FAQ, and section
  primitives.
- [x] Configure route titles, descriptions, canonical URLs, robots, and sitemap.
- [ ] Add structured data.
- [ ] Add privacy-conscious conversion analytics.

### P2 - Original product assets and copy

- [ ] Create deterministic demo data for marketing captures.
- [ ] Capture the required desktop and mobile screenshot matrix.
- [ ] Create the device composition from real LightFlux captures.
- [ ] Produce favicon, wordmark, social preview, and platform icons.
- [x] Write concise Chinese copy based only on shipped behavior.
- [ ] Write English copy if bilingual launch is approved.
- [ ] Review every claim against current product behavior and release status.

### P3 - Home page

- [x] Implement the responsive header and first-viewport hero.
- [x] Keep the brand, primary action, product preview, and next-section hint
  visible at desktop and mobile sizes.
- [x] Implement the local-first product-principles band.
- [x] Implement scenario-led core workflow sections.
- [x] Implement the controlled-AI section.
- [x] Implement search/statistics proof.
- [x] Implement the platform section.
- [x] Implement FAQ, final CTA, and complete footer.
- [ ] Complete reduced-motion and keyboard-only audits.

### P4 - Features page

- [x] Implement the seven outcome-led feature groups.
- [ ] Add anchored section navigation on desktop and a compact mobile index.
- [x] Pair every major claim with a product UI preview.
- [x] Add clear links from relevant sections to Web App or Download.
- [x] Keep unsupported/future features out of the page.

### P5 - Download and release integration

- [ ] Build a release-metadata adapter for the public GitHub repository.
- [ ] Map macOS Apple Silicon, macOS Intel, and Windows x64 assets.
- [ ] Add platform detection without hiding alternative downloads.
- [ ] Display version, architecture, size, and release notes.
- [x] Add Web App as a first-class option.
- [x] Add the public GitHub Release page as the first-version fallback.
- [x] Display current signing/notarization status.
- [ ] Publish and verify Linux artifacts before enabling Linux.
- [ ] Add iOS/Android store links only after public releases exist.

### P6 - Help, legal, quality, and launch

- [x] Implement a searchable first-version Help/FAQ index.
- [x] Add first-version Privacy and Terms routes.
- [x] Add a first-version changelog.
- [ ] Verify every navigation, auth, download, legal, and footer link.
- [ ] Test 390, 402, 768, 1024, and 1440px viewports.
- [ ] Test Safari, Chrome, Firefox, and Edge.
- [ ] Run accessibility checks and keyboard-only workflows.
- [ ] Run Lighthouse and fix regressions below the agreed targets.
- [ ] Verify analytics events without collecting task or account content.
- [ ] Verify existing Nginx SPA routing, redirects, headers, and cache policy.
- [ ] Add CI checks for build, broken links, metadata, and key responsive routes.
- [ ] Launch behind a preview URL, review copy/screenshots, then switch DNS.

## Acceptance Gate

The first public release is ready only when:

- All claims correspond to shipped LightFlux behavior.
- The Web App and every enabled download link work.
- No unsupported platform is presented as available.
- Real screenshots load without layout shifts or personal data.
- Home, Features, Download, Help, Privacy, Terms, and Changelog routes exist.
- Mobile navigation and all CTAs work at 390px.
- Desktop layouts remain coherent at 1440px.
- Accessibility, SEO metadata, structured data, and performance targets pass.
- The application and marketing deployments remain independently reversible.
