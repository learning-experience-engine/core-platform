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

## Differentiators (主线 / 支线 / 多维)

- 主线: Question-chain guided learning that starts from a real-world question.
- 支线: Deep-dive card stacks that stay navigable and shareable.
- 多维: Relation facets (what/how/in_life/compare/practice) to explore from different angles.

## Getting Started

```bash
pnpm install
pnpm dev
```

## Try it quickly (5 URLs)

- Weather deep-dive: `http://localhost:5173/?stack=weather,air_pressure,wind`
- Skin deep-dive: `http://localhost:5173/?stack=skin,epidermis,dermis`
- Skin chain: `http://localhost:5173/?stack=skin&chain=skin_intro&step=0&age=adult`
- Plant cell chain: `http://localhost:5173/?stack=plant_cell&chain=plant_cell_intro&step=0&age=adult`
- Mixed path: `http://localhost:5173/?stack=plant_cell,protoplast&chain=plant_cell_intro&step=1&age=child`

## Where to contribute

- New to the project? Start here:
  - [Good first issues](https://github.com/learning-experience-engine/core-platform/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- Want to improve UX?
  - GraphMini / RelationDock / QuestionChainPanel in `packages/renderer-web` and `apps/web-demo`
- Want to work on platform core?
  - State machines in `packages/core`
- Want to help content?
  - Add nodes/chains under `content/examples` (run `pnpm lint:content`)
- Want to propose architecture?
  - Use `docs/rfc` and GitHub Discussions (RFC category)
- Quick links:
  - [Discussions RFC hub](https://github.com/learning-experience-engine/core-platform/discussions/categories/rfc)
  - [DEMO.md](DEMO.md)
