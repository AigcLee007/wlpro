# gpt-image-2.5-sunburst Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `gpt-image-2.5-sunburst` with three configured OpenAI image routes, route-specific quality options, pricing, and the same generation/edit behavior as `gpt-image-2`.

**Architecture:** Extend the existing static image model/route catalogs. Reuse the GPT Image request normalization and forwarding paths by expanding the recognized model set. Keep quality choices in the UI derived from the selected sunburst route so line 1 cannot select `xhigh` or `max`.

**Tech Stack:** Node.js/Express, JSON catalogs, React/TypeScript, classic browser JavaScript, Vitest, Vite.

---

### Task 1: Add failing catalog and quality behavior tests

**Files:**
- Create: `src/test/gptImageSunburst.test.ts`

- [ ] **Step 1: Write failing tests** for the new model, three route IDs, exact prices/API-key environment names, GPT model recognition, and line-specific quality options.
- [ ] **Step 2: Run `npm test -- src/test/gptImageSunburst.test.ts`** and confirm failures mention the missing model/routes or helper behavior.

### Task 2: Add model and route catalog entries

**Files:**
- Modify: `config/imageModels.json`
- Modify: `config/imageRoutes.json`

- [ ] **Step 1: Add the model** with ID/request model `gpt-image-2.5-sunburst`, `1k/2k/4k` sizes, default `2k`, GPT-style panel and custom ratios.
- [ ] **Step 2: Add line1/line2/line3** using the three base URLs, environment variables, standard OpenAI generation/edit paths, async line1 and sync lines 2/3, and the requested size prices.
- [ ] **Step 3: Run the catalog tests** and confirm catalog assertions pass while forwarding/UI assertions remain red.

### Task 3: Extend backend GPT image routing

**Files:**
- Modify: `server.cjs`

- [ ] **Step 1: Add `gpt-image-2.5-sunburst` to the recognized GPT request model set.**
- [ ] **Step 2: Add line2 and line3 to background sync route IDs** so sync upstream responses are handled through the existing local task/settlement flow.
- [ ] **Step 3: Verify generated JSON and edit multipart bodies preserve `model`, normalized `size`, and `quality`.**
- [ ] **Step 4: Run the focused tests and the server syntax check `node --check server.cjs`.**

### Task 4: Update modern React quality controls and model handling

**Files:**
- Modify: `src/store/selectionStore.ts`
- Modify: `src/config/imageModels.ts`
- Modify: `src/config/imageRoutes.ts`
- Modify: `components/ImageFormConfig.tsx`
- Modify: `components/ControlPanel.tsx`

- [ ] **Step 1: Expand the quality type** to include `xhigh` and `max` while retaining existing defaults.
- [ ] **Step 2: Add helpers** that identify GPT Image models and return quality choices by selected sunburst route.
- [ ] **Step 3: Render the quality control for both GPT Image models** and clamp unsupported stored values when line 1 is selected.
- [ ] **Step 4: Reuse GPT image prompt, size, reference-image, generate, and edit payload paths** for sunburst.
- [ ] **Step 5: Run focused tests and `npm run build`.**

### Task 5: Update classic UI fallback and request handling

**Files:**
- Modify: `public/classic-app/script.js`
- Modify: `public/classic-app/index.html`

- [ ] **Step 1: Add fallback catalog entries** for the model and three routes so the classic UI remains usable before its catalog request completes.
- [ ] **Step 2: Treat sunburst as a GPT image model** for reference limits, prompt handling, model mapping, generate/edit payloads, and quality forwarding.
- [ ] **Step 3: Add `xhigh` and `max` menu items** and dynamically hide them for line1; reset an unsupported stored quality to `auto`.
- [ ] **Step 4: Run `node --check public/classic-app/script.js` and the build.**

### Task 6: Full verification

- [ ] **Step 1: Run `npm test` and confirm zero failures.**
- [ ] **Step 2: Run `npm run build` and confirm Vite exits successfully.**
- [ ] **Step 3: Inspect `git diff --check` and the final diff for accidental changes or secrets.**
- [ ] **Step 4: Commit the implementation with `feat: add gpt-image-2.5-sunburst model`.**
