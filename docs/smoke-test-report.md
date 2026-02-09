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
