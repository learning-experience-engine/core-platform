# Demo Walkthrough (10 minutes)

## Run
```bash
pnpm install
pnpm dev
```

Open: http://localhost:5173

## Try these experiences

1. Deep-dive (stack)
   - Start at Plant Cell
   - Click a highlighted term (e.g., Protoplast)
   - Click another term inside the new card (e.g., Membrane / Bacteria)
   - Use the breadcrumb chips at the top to go back

2. Relations (facets)
   - On any card, go to RELATIONS
   - Switch tabs: 是什么 / 怎么实现 / 生活体现 / 差异对比 / 动手实践
   - Click any relation chip to navigate

3. Neighborhood (graph)
   - On any card, go to NEIGHBORHOOD
   - Switch facet filters + Graph/List view
   - Click neighbors to navigate (URL updates)

4. Question chain (guided)
   - On nodes with a chain, click Start Question Chain
   - Switch Child/Adult
   - Use Prev/Next
   - Click highlighted terms inside answers to deep-dive without losing the chain

## Example URLs

- Weather deep-dive: http://localhost:5173/?stack=weather,air_pressure,wind
- Skin deep-dive: http://localhost:5173/?stack=skin,epidermis,dermis
- Skin chain: http://localhost:5173/?stack=skin&chain=skin_intro&step=0&age=adult
- Sun tan chain: http://localhost:5173/?stack=skin&chain=sun_tan_uv&step=0&age=adult (晒黑与防晒主题)
- Plant cell chain: http://localhost:5173/?stack=plant_cell&chain=plant_cell_intro&step=0&age=adult
- Mixed: http://localhost:5173/?stack=plant_cell,protoplast&chain=plant_cell_intro&step=1&age=child
