# Web Demo

## URL Sync

The card stack is encoded in the query string using the `stack` parameter:

- Format: `/?stack=plant_cell,protoplast,bacteria`
- Default: when missing or empty, falls back to `plant_cell`
- Invalid IDs: unknown node IDs are dropped; if none remain, it falls back to `plant_cell`
- Dedup: consecutive duplicate IDs are collapsed (`a,a,b` → `a,b`)

### Shareable Example

`http://localhost:5173/?stack=plant_cell,protoplast,bacteria`
