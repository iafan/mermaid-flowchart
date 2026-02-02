# mermaid-flowchart

> **⚠️ Experimental:** This is a crude, minimal implementation not meant to replace the official [Mermaid](https://mermaid.js.org/) rendering library. It was created as an experiment with a lightweight solution for markdown preview. This is not production code — use the official Mermaid library for any serious use case.

Parse Mermaid flowchart syntax and render as SVG with CSS variable-based theming.

## Installation

```bash
npm install mermaid-flowchart
```

Or install from GitHub:

```json
{
  "dependencies": {
    "mermaid-flowchart": "github:iafan/mermaid-flowchart"
  }
}
```

## Usage

```typescript
import { renderFlowchart } from 'mermaid-flowchart'

const source = `
flowchart TB
  A[Start] --> B{Decision}
  B -->|Yes| C[Action]
  B -->|No| D[End]
`

const svg = renderFlowchart(source)
document.body.innerHTML = svg
```

### API

#### `renderFlowchart(source: string): string`

Parse Mermaid flowchart and render as SVG.

#### `parseFlowchart(source: string): Flowchart`

Parse Mermaid flowchart syntax into a Flowchart object.

#### `layoutFlowchart(flowchart: Flowchart): FlowchartLayout`

Compute positions for all nodes and edges.

#### `renderFlowchartSvg(flowchart: Flowchart, layout: FlowchartLayout): string`

Render a flowchart with layout as SVG.

## Supported Syntax

- Directions: `TB`, `BT`, `LR`, `RL`
- Node shapes: `[rect]`, `(rounded)`, `{diamond}`, `((circle))`
- Edge types: `-->` (solid), `-.->` (dashed)
- Edge labels: `-->|label|`
- Subgraphs: `subgraph id["Label"]`

## CSS Variables

The SVG uses CSS variables for theming with sensible defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `--flowchart-node-fill` | `#fff` | Node background |
| `--flowchart-node-stroke` | `#333` | Node border |
| `--flowchart-node-label` | `#333` | Node text |
| `--flowchart-edge-stroke` | `#666` | Edge line |
| `--flowchart-edge-arrow` | `#666` | Arrow fill |
| `--flowchart-edge-label` | `#666` | Edge label text |
| `--flowchart-edge-label-bg` | `#fff` | Edge label background |
| `--flowchart-subgraph-fill` | `#f5f5f5` | Subgraph background |
| `--flowchart-subgraph-stroke` | `#999` | Subgraph border |
| `--flowchart-subgraph-label` | `#666` | Subgraph label text |

### Example: Dark Theme

```css
:root {
  --flowchart-node-fill: #2d2d2d;
  --flowchart-node-stroke: #888;
  --flowchart-node-label: #e0e0e0;
  --flowchart-edge-stroke: #888;
  --flowchart-edge-arrow: #888;
  --flowchart-edge-label: #aaa;
  --flowchart-edge-label-bg: #1e1e1e;
  --flowchart-subgraph-fill: #252525;
  --flowchart-subgraph-stroke: #666;
  --flowchart-subgraph-label: #aaa;
}
```

## License

This is free and unencumbered software released into the public domain (Unlicense).
