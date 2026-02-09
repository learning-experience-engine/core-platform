# Smoke Test Report (Final Gate)

Date: 2026-02-09
Branch: `chore/week1-polish`
Tester: manual (user)

## Environment

- Command: `pnpm dev`
- URL: http://localhost:5173

## Results

### Deep-dive stack

- Opened deep-dive preset / URL: pass
- Clicked terms to expand 2 levels: pass
- Breadcrumb back navigation: pass
- Refresh keeps state: pass

### Relations facet switching

- Switched 5 facet tabs: pass
- 3+ facets with content: pass
- Clicked a relation; URL stack updated: pass

### Neighborhood facet + view toggle

- Facet switch (All + 2 facets): pass
- Graph/List view toggle: pass
- Click neighbor; URL stack updated: pass
- If truncated, “More neighbors not shown” visible: pass

### Question chain

- Start Question Chain from card: pass
- Switch Child/Adult; answers change: pass
- Prev/Next boundaries correct: pass
- Mentions open deep-dive card without losing chain: pass
- Exit clears chain/step/age in URL: pass

### Mixed URL

- Open mixed URL in new tab; refresh preserves state: pass

## Notes

- Manual run completed; all checks passed.

## Skin domain smoke (manual)

Status: NOT RUN (no interactive browser / GUI access in current environment)

### URLs to test
- Skin deep-dive (stack): http://localhost:5173/?stack=skin,epidermis,dermis
- Skin chain (skin_intro): http://localhost:5173/?stack=skin&chain=skin_intro&step=0&age=adult
- Skin chain (acne_why): http://localhost:5173/?stack=skin&chain=acne_why&step=0&age=adult

### Steps + Expected
1) Open the skin deep-dive URL
   - Expected: Card stack loads at `skin` and can navigate via Relations/Neighborhood to `epidermis`, `dermis`, etc.
   - Expected: URL stack updates as you navigate and refresh preserves state.

2) Start `skin_intro` chain (or open its URL directly)
   - Expected: Child/Adult toggle changes answer content.
   - Expected: Clicking mentions (e.g., 表皮/真皮/汗腺/皮脂腺/微生物群) pushes the corresponding card without losing chain state.
   - Expected: Exit/Close clears `chain/step/age` params from URL.

3) Start `acne_why` chain (or open its URL directly)
   - Expected: Prev/Next works (no out-of-bounds).
   - Expected: At least step 1–2 mention navigation works and returns to chain.

## Weather chain smoke (manual)

Status: NOT RUN (no interactive browser / GUI access)

URLs to test: typhoon_safety, weather_intro

Steps + Expected:
1. Open the typhoon_safety URL
Expected: chain can start, Child/Adult toggle changes answers.
Expected: clicking mentions deep-dives to nodes without losing chain state.
Expected: Exit/Close clears chain params from URL.

2. Open the weather_intro URL (if present)
Expected: chain loads and mentions deep-dive without losing chain state.
Expected: Exit/Close clears chain params from URL.
