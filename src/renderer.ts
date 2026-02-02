import type { Flowchart, FlowchartNode } from './parser'
import type { FlowchartLayout, NodeLayout, EdgeLayout, SubgraphLayout } from './layout'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderNodeShape(node: NodeLayout, flowchartNode: FlowchartNode): string {
  const { x, y, width, height } = node
  const rx = 4 // border radius

  switch (flowchartNode.shape) {
    case 'rounded':
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="20" ry="20" class="flowchart-node"/>`
    case 'diamond':
      const cx = x + width / 2
      const cy = y + height / 2
      const hw = width / 2
      const hh = height / 2
      return `<polygon points="${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}" class="flowchart-node"/>`
    case 'circle':
      const r = Math.min(width, height) / 2
      return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${r}" class="flowchart-node"/>`
    case 'rect':
    default:
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${rx}" class="flowchart-node"/>`
  }
}

function renderNodeLabel(node: NodeLayout, flowchartNode: FlowchartNode): string {
  const { x, y, width, height } = node
  const cx = x + width / 2
  const cy = y + height / 2

  // Handle <br/> tags for multiline
  const lines = flowchartNode.label.split(/<br\s*\/?>/)

  if (lines.length === 1) {
    return `<text x="${cx}" y="${cy}" class="flowchart-node-label" dominant-baseline="middle" text-anchor="middle">${escapeHtml(lines[0])}</text>`
  }

  // Multiline text
  const lineHeight = 14
  const startY = cy - ((lines.length - 1) * lineHeight) / 2

  return lines.map((line, i) =>
    `<text x="${cx}" y="${startY + i * lineHeight}" class="flowchart-node-label" dominant-baseline="middle" text-anchor="middle">${escapeHtml(line)}</text>`
  ).join('\n')
}

function renderEdge(edge: EdgeLayout): string {
  if (edge.points.length < 2) return ''

  const [start, end] = edge.points
  const dashArray = edge.style === 'dashed' ? 'stroke-dasharray="5,5"' : ''

  // Calculate angle for arrow
  const dx = end.x - start.x
  const dy = end.y - start.y
  const angle = Math.atan2(dy, dx)

  // Arrow head size
  const arrowSize = 8

  // Adjust end point to not overlap with arrow
  const adjustedEnd = {
    x: end.x - Math.cos(angle) * arrowSize,
    y: end.y - Math.sin(angle) * arrowSize,
  }

  // Create path with slight curve for better aesthetics
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2

  let path: string
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal-ish: use vertical control points
    path = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${adjustedEnd.x} ${adjustedEnd.y}`
  } else {
    // Vertical-ish: use horizontal control points
    path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${adjustedEnd.x} ${adjustedEnd.y}`
  }

  // Arrow head
  const arrowPath = `
    M ${end.x} ${end.y}
    L ${end.x - arrowSize * Math.cos(angle - Math.PI / 6)} ${end.y - arrowSize * Math.sin(angle - Math.PI / 6)}
    L ${end.x - arrowSize * Math.cos(angle + Math.PI / 6)} ${end.y - arrowSize * Math.sin(angle + Math.PI / 6)}
    Z
  `

  let labelSvg = ''
  if (edge.label) {
    const labelX = midX
    const labelY = midY - 8
    labelSvg = `
      <rect x="${labelX - edge.label.length * 4}" y="${labelY - 10}"
            width="${edge.label.length * 8}" height="16"
            class="flowchart-edge-label-bg"/>
      <text x="${labelX}" y="${labelY}" class="flowchart-edge-label"
            dominant-baseline="middle" text-anchor="middle">${escapeHtml(edge.label)}</text>
    `
  }

  return `
    <g class="flowchart-edge">
      <path d="${path}" class="flowchart-edge-path" ${dashArray}/>
      <path d="${arrowPath}" class="flowchart-edge-arrow"/>
      ${labelSvg}
    </g>
  `
}

function renderSubgraph(subgraph: SubgraphLayout): string {
  const { x, y, width, height, label, style } = subgraph

  let styleAttr = ''
  if (style) {
    const fill = style.fill || 'none'
    const stroke = style.stroke || '#666'
    styleAttr = `fill="${fill}" stroke="${stroke}"`
  }

  return `
    <g class="flowchart-subgraph">
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
            class="flowchart-subgraph-rect" rx="8" ry="8" ${styleAttr}/>
      <text x="${x + 10}" y="${y + 20}" class="flowchart-subgraph-label">${escapeHtml(label)}</text>
    </g>
  `
}

export function renderFlowchartSvg(flowchart: Flowchart, layout: FlowchartLayout): string {
  const { width, height, nodes, edges, subgraphs } = layout

  const subgraphsSvg = subgraphs.map(sg => renderSubgraph(sg)).join('\n')

  const edgesSvg = edges.map(edge => renderEdge(edge)).join('\n')

  const nodesSvg = nodes.map(node => {
    const flowchartNode = flowchart.nodes.get(node.id)!
    return `
      <g class="flowchart-node-group" data-id="${node.id}">
        ${renderNodeShape(node, flowchartNode)}
        ${renderNodeLabel(node, flowchartNode)}
      </g>
    `
  }).join('\n')

  // Use CSS variables with defaults for standalone use
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="flowchart-svg">
      <style>
        .flowchart-svg {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          font-size: 12px;
        }
        .flowchart-node {
          fill: var(--flowchart-node-fill, #fff);
          stroke: var(--flowchart-node-stroke, #333);
          stroke-width: 1.5;
        }
        .flowchart-node-label {
          fill: var(--flowchart-node-label, #333);
          font-size: 12px;
        }
        .flowchart-edge-path {
          fill: none;
          stroke: var(--flowchart-edge-stroke, #666);
          stroke-width: 1.5;
        }
        .flowchart-edge-arrow {
          fill: var(--flowchart-edge-arrow, #666);
          stroke: none;
        }
        .flowchart-edge-label {
          fill: var(--flowchart-edge-label, #666);
          font-size: 11px;
        }
        .flowchart-edge-label-bg {
          fill: var(--flowchart-edge-label-bg, #fff);
          stroke: none;
        }
        .flowchart-subgraph-rect {
          fill: var(--flowchart-subgraph-fill, #f5f5f5);
          stroke: var(--flowchart-subgraph-stroke, #999);
          stroke-width: 1;
          stroke-dasharray: 5,5;
        }
        .flowchart-subgraph-label {
          fill: var(--flowchart-subgraph-label, #666);
          font-weight: 500;
          font-size: 13px;
        }
      </style>
      ${subgraphsSvg}
      ${edgesSvg}
      ${nodesSvg}
    </svg>
  `
}
