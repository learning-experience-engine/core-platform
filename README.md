# Core-platform

An open-source platform for building curiosity-driven, explorable learning experiences.

## What problem are we solving?

- Traditional knowledge systems give answers, but do not guide understanding.
- Learners often want to explore from real-world questions, not from abstract definitions.

This project explores a new learning model based on:
- Topic branches + knowledge nodes
- Question-chain guided learning
- Deep-dive knowledge cards
- Multi-dimensional knowledge graphs

## Project Status

⚠️ This project is in early exploration stage.
The architecture is intentionally incomplete and open for discussion.

## Core Ideas

- Learning starts from real-world scenarios
- Knowledge can be explored progressively without losing context
- Content is structured, not just text pages

## Getting Started

```bash
pnpm install
pnpm dev
```

## Shareable Paths

The web demo syncs the card stack to the URL query string. Share a path by copying the URL after navigating:

- Example: `http://localhost:5173/?stack=plant_cell,protoplast,bacteria`

When someone opens the link, the demo will restore the same stack.

## Where to contribute

- New to the project? Start here:
  - [Good first issues](https://github.com/learning-experience-engine/core-platform/issues)
- Want to improve UX?
  - GraphMini / RelationDock / QuestionChainPanel in `packages/renderer-web` and `apps/web-demo`
- Want to work on platform core?
  - State machines in `packages/core`
- Want to help content?
  - Add nodes/chains under `content/examples` (run `pnpm lint:content`)
- Want to propose architecture?
  - Use `docs/rfc` and GitHub Discussions (RFC category)
