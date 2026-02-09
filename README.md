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
