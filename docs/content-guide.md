# Content Guide (Nodes + Chains)

Use this guide when adding or editing content under `content/`.

## Rules

1. Keep `id` lowercase snake_case and stable once published.
2. `title` is short, readable, and consistent with the term used in `body`.
3. `body` should be 1-3 sentences and explain the core idea plainly.
4. Use mentions by writing `[Term]` in `body` and mapping `"Term": "node_id"` in `mentions`.
5. Mentions should point to nodes that already exist (or are added in the same PR).
6. Every node should include relations across facets: `what`, `how`, `in_life`, `compare`, `practice`.
7. Use `compare_with` only when you can clearly explain the contrast in the label or body.
8. Use `has_part` / `part_of` to express structure or composition (not just “related”).
9. Relation `label` should be short and concrete (3-8 chars in CN or 1-3 words in EN).
10. Avoid duplicate relations pointing to the same target with the same facet and label.
11. Chains should be 4-6 steps when possible, each step has `child` + `adult`.
12. Steps should follow a progression: definition → mechanism → comparison → application.
13. Include at least 2 steps with mentions that navigate to other nodes.
14. Keep questions concise; each question should be answerable by the linked nodes.
15. Validate JSON with `pnpm lint:content` before committing.

## Facet Mapping

- `what`: definition, composition, classification
- `how`: mechanism, process, method
- `in_life`: real-world uses or phenomena
- `compare`: differences, trade-offs, contrasts
- `practice`: experiments, hands-on actions
