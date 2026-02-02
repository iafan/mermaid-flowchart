"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  layoutFlowchart: () => layoutFlowchart,
  parseFlowchart: () => parseFlowchart,
  renderFlowchart: () => renderFlowchart,
  renderFlowchartSvg: () => renderFlowchartSvg
});
module.exports = __toCommonJS(index_exports);

// src/parser.ts
function parseNodeDefinition(text) {
  const patterns = [
    { regex: /^(\w+)\[\[(.+)\]\]$/, shape: "rect" },
    // [[label]] - subroutine
    { regex: /^(\w+)\[(.+)\]$/, shape: "rect" },
    // [label] - rectangle
    { regex: /^(\w+)\((.+)\)$/, shape: "rounded" },
    // (label) - rounded
    { regex: /^(\w+)\(\((.+)\)\)$/, shape: "circle" },
    // ((label)) - circle
    { regex: /^(\w+)\{(.+)\}$/, shape: "diamond" }
    // {label} - diamond
  ];
  for (const { regex, shape } of patterns) {
    const match = text.match(regex);
    if (match) {
      return { id: match[1], label: match[2], shape };
    }
  }
  const plainMatch = text.match(/^(\w+)$/);
  if (plainMatch) {
    return { id: plainMatch[1], label: plainMatch[1], shape: "rect" };
  }
  return null;
}
function parseEdge(line) {
  const edgePatterns = [
    /^(.+?)\s*-->\|"?([^"|]+)"?\|\s*(.+)$/,
    // -->|label|
    /^(.+?)\s*-\.->\|"?([^"|]+)"?\|\s*(.+)$/,
    // -.->|label|
    /^(.+?)\s*-->\s*(.+)$/,
    // -->
    /^(.+?)\s*-\.->\s*(.+)$/
    // -.->
  ];
  for (let i = 0; i < edgePatterns.length; i++) {
    const match = line.match(edgePatterns[i]);
    if (match) {
      const hasLabel = i < 2;
      const style = i === 1 || i === 3 ? "dashed" : "solid";
      let fromPart, toPart, label;
      if (hasLabel) {
        fromPart = match[1].trim();
        label = match[2].trim();
        toPart = match[3].trim();
      } else {
        fromPart = match[1].trim();
        toPart = match[2].trim();
      }
      const fromNode = parseNodeDefinition(fromPart);
      const toNode = parseNodeDefinition(toPart);
      if (fromNode && toNode) {
        const result = {
          from: fromNode.id,
          to: toNode.id,
          label,
          style
        };
        if (fromNode.label !== fromNode.id) {
          result.fromNode = fromNode;
        }
        if (toNode.label !== toNode.id) {
          result.toNode = toNode;
        }
        return result;
      }
    }
  }
  return null;
}
function parseStyle(line) {
  const match = line.match(/^style\s+(\w+)\s+(.+)$/);
  if (!match) return null;
  const id = match[1];
  const styleStr = match[2];
  const styles = {};
  const parts = styleStr.split(",");
  for (const part of parts) {
    const [key, value] = part.split(":").map((s) => s.trim());
    if (key && value) {
      styles[key] = value;
    }
  }
  return { id, styles };
}
function parseFlowchart(source) {
  const lines = source.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("%%"));
  const flowchart = {
    direction: "TB",
    nodes: /* @__PURE__ */ new Map(),
    edges: [],
    subgraphs: []
  };
  const firstLine = lines[0];
  const dirMatch = firstLine?.match(/^flowchart\s+(TB|BT|LR|RL)$/i);
  if (dirMatch) {
    flowchart.direction = dirMatch[1].toUpperCase();
    lines.shift();
  } else if (firstLine?.startsWith("flowchart")) {
    flowchart.direction = "TB";
    lines.shift();
  }
  let currentSubgraph = null;
  const subgraphStack = [];
  const nodeToSubgraph = /* @__PURE__ */ new Map();
  for (const line of lines) {
    const subgraphMatch = line.match(/^subgraph\s+(\w+)(?:\["([^"]+)"\])?$/);
    if (subgraphMatch) {
      const subgraph = {
        id: subgraphMatch[1],
        label: subgraphMatch[2] || subgraphMatch[1],
        nodeIds: []
      };
      if (currentSubgraph) {
        subgraphStack.push(currentSubgraph);
      }
      currentSubgraph = subgraph;
      flowchart.subgraphs.push(subgraph);
      continue;
    }
    if (line === "end") {
      currentSubgraph = subgraphStack.pop() || null;
      continue;
    }
    const styleResult = parseStyle(line);
    if (styleResult) {
      const subgraph = flowchart.subgraphs.find((s) => s.id === styleResult.id);
      if (subgraph) {
        subgraph.style = styleResult.styles;
      }
      continue;
    }
    const edgeResult = parseEdge(line);
    if (edgeResult) {
      if (edgeResult.fromNode) {
        flowchart.nodes.set(edgeResult.fromNode.id, edgeResult.fromNode);
      } else if (!flowchart.nodes.has(edgeResult.from)) {
        flowchart.nodes.set(edgeResult.from, {
          id: edgeResult.from,
          label: edgeResult.from,
          shape: "rect"
        });
      }
      if (edgeResult.toNode) {
        flowchart.nodes.set(edgeResult.toNode.id, edgeResult.toNode);
      } else if (!flowchart.nodes.has(edgeResult.to)) {
        flowchart.nodes.set(edgeResult.to, {
          id: edgeResult.to,
          label: edgeResult.to,
          shape: "rect"
        });
      }
      if (currentSubgraph) {
        if (!nodeToSubgraph.has(edgeResult.from)) {
          currentSubgraph.nodeIds.push(edgeResult.from);
          nodeToSubgraph.set(edgeResult.from, currentSubgraph.id);
        }
        if (!nodeToSubgraph.has(edgeResult.to)) {
          currentSubgraph.nodeIds.push(edgeResult.to);
          nodeToSubgraph.set(edgeResult.to, currentSubgraph.id);
        }
      }
      flowchart.edges.push({
        from: edgeResult.from,
        to: edgeResult.to,
        label: edgeResult.label,
        style: edgeResult.style
      });
      continue;
    }
    const nodeResult = parseNodeDefinition(line);
    if (nodeResult) {
      flowchart.nodes.set(nodeResult.id, {
        id: nodeResult.id,
        label: nodeResult.label,
        shape: nodeResult.shape
      });
      if (currentSubgraph && !nodeToSubgraph.has(nodeResult.id)) {
        currentSubgraph.nodeIds.push(nodeResult.id);
        nodeToSubgraph.set(nodeResult.id, currentSubgraph.id);
      }
    }
  }
  return flowchart;
}

// src/layout.ts
var NODE_WIDTH = 150;
var NODE_HEIGHT = 50;
var NODE_PADDING = 30;
var SUBGRAPH_PADDING = 40;
var SUBGRAPH_HEADER = 30;
function computeRanks(flowchart) {
  const ranks = /* @__PURE__ */ new Map();
  const nodeIds = Array.from(flowchart.nodes.keys());
  const outgoing = /* @__PURE__ */ new Map();
  const incoming = /* @__PURE__ */ new Map();
  for (const id of nodeIds) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }
  for (const edge of flowchart.edges) {
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
  }
  const roots = nodeIds.filter((id) => incoming.get(id)?.length === 0);
  if (roots.length === 0 && nodeIds.length > 0) {
    roots.push(nodeIds[0]);
  }
  const visited = /* @__PURE__ */ new Set();
  const queue = roots.map((id) => ({ id, rank: 0 }));
  while (queue.length > 0) {
    const { id, rank } = queue.shift();
    if (visited.has(id)) {
      const existing = ranks.get(id);
      if (existing && rank > existing.rank) {
        existing.rank = rank;
      }
      continue;
    }
    visited.add(id);
    ranks.set(id, { id, rank, order: 0 });
    for (const next of outgoing.get(id) || []) {
      queue.push({ id: next, rank: rank + 1 });
    }
  }
  for (const id of nodeIds) {
    if (!ranks.has(id)) {
      ranks.set(id, { id, rank: 0, order: 0 });
    }
  }
  const rankGroups = /* @__PURE__ */ new Map();
  for (const [id, info] of ranks) {
    const group = rankGroups.get(info.rank) || [];
    group.push(id);
    rankGroups.set(info.rank, group);
  }
  for (const [, group] of rankGroups) {
    group.forEach((id, index) => {
      const info = ranks.get(id);
      info.order = index;
    });
  }
  return ranks;
}
function layoutSubgraph(subgraph, nodeLayouts, direction) {
  if (subgraph.nodeIds.length === 0) {
    return {
      id: subgraph.id,
      label: subgraph.label,
      x: 0,
      y: 0,
      width: NODE_WIDTH + SUBGRAPH_PADDING * 2,
      height: NODE_HEIGHT + SUBGRAPH_PADDING * 2 + SUBGRAPH_HEADER,
      style: subgraph.style
    };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const nodeId of subgraph.nodeIds) {
    const node = nodeLayouts.get(nodeId);
    if (node) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }
  }
  return {
    id: subgraph.id,
    label: subgraph.label,
    x: minX - SUBGRAPH_PADDING,
    y: minY - SUBGRAPH_PADDING - SUBGRAPH_HEADER,
    width: maxX - minX + SUBGRAPH_PADDING * 2,
    height: maxY - minY + SUBGRAPH_PADDING * 2 + SUBGRAPH_HEADER,
    style: subgraph.style
  };
}
function layoutFlowchart(flowchart) {
  const ranks = computeRanks(flowchart);
  const nodeLayouts = /* @__PURE__ */ new Map();
  const direction = flowchart.direction;
  const subgraphNodeIds = /* @__PURE__ */ new Set();
  for (const sg of flowchart.subgraphs) {
    for (const id of sg.nodeIds) {
      subgraphNodeIds.add(id);
    }
  }
  const rankCounts = /* @__PURE__ */ new Map();
  for (const info of ranks.values()) {
    rankCounts.set(info.rank, (rankCounts.get(info.rank) || 0) + 1);
  }
  const isVertical = direction === "TB" || direction === "BT";
  const isReversed = direction === "BT" || direction === "RL";
  for (const [id, info] of ranks) {
    const node = flowchart.nodes.get(id);
    const rankCount = rankCounts.get(info.rank) || 1;
    let x, y;
    const rankSpacing = NODE_HEIGHT + NODE_PADDING * 2;
    const orderSpacing = NODE_WIDTH + NODE_PADDING;
    if (isVertical) {
      x = info.order * orderSpacing + NODE_PADDING / 2;
      y = info.rank * rankSpacing + NODE_PADDING;
      if (isReversed) {
        const maxRank = Math.max(...Array.from(ranks.values()).map((r) => r.rank));
        y = (maxRank - info.rank) * rankSpacing + NODE_PADDING;
      }
    } else {
      x = info.rank * (NODE_WIDTH + NODE_PADDING * 2) + NODE_PADDING;
      y = info.order * rankSpacing + NODE_PADDING;
      if (isReversed) {
        const maxRank = Math.max(...Array.from(ranks.values()).map((r) => r.rank));
        x = (maxRank - info.rank) * (NODE_WIDTH + NODE_PADDING * 2) + NODE_PADDING;
      }
    }
    nodeLayouts.set(id, {
      id,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    });
  }
  const subgraphLayouts = [];
  let subgraphOffsetY = 0;
  for (const subgraph of flowchart.subgraphs) {
    const sgLayout = layoutSubgraph(subgraph, nodeLayouts, direction);
    const offsetY2 = subgraphOffsetY - sgLayout.y + NODE_PADDING;
    for (const nodeId of subgraph.nodeIds) {
      const node = nodeLayouts.get(nodeId);
      if (node) {
        node.y += offsetY2;
      }
    }
    const finalLayout = layoutSubgraph(subgraph, nodeLayouts, direction);
    subgraphLayouts.push(finalLayout);
    subgraphOffsetY = finalLayout.y + finalLayout.height + NODE_PADDING;
  }
  const edgeLayouts = flowchart.edges.map((edge) => {
    const fromNode = nodeLayouts.get(edge.from);
    const toNode = nodeLayouts.get(edge.to);
    if (!fromNode || !toNode) {
      return {
        from: edge.from,
        to: edge.to,
        label: edge.label,
        style: edge.style,
        points: []
      };
    }
    const fromCenter = {
      x: fromNode.x + fromNode.width / 2,
      y: fromNode.y + fromNode.height / 2
    };
    const toCenter = {
      x: toNode.x + toNode.width / 2,
      y: toNode.y + toNode.height / 2
    };
    let startPoint;
    let endPoint;
    if (isVertical) {
      if (fromCenter.y < toCenter.y) {
        startPoint = { x: fromCenter.x, y: fromNode.y + fromNode.height };
        endPoint = { x: toCenter.x, y: toNode.y };
      } else {
        startPoint = { x: fromCenter.x, y: fromNode.y };
        endPoint = { x: toCenter.x, y: toNode.y + toNode.height };
      }
    } else {
      if (fromCenter.x < toCenter.x) {
        startPoint = { x: fromNode.x + fromNode.width, y: fromCenter.y };
        endPoint = { x: toNode.x, y: toCenter.y };
      } else {
        startPoint = { x: fromNode.x, y: fromCenter.y };
        endPoint = { x: toNode.x + toNode.width, y: toCenter.y };
      }
    }
    return {
      from: edge.from,
      to: edge.to,
      label: edge.label,
      style: edge.style,
      points: [startPoint, endPoint]
    };
  });
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const node of nodeLayouts.values()) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  for (const sg of subgraphLayouts) {
    minX = Math.min(minX, sg.x);
    minY = Math.min(minY, sg.y);
    maxX = Math.max(maxX, sg.x + sg.width);
    maxY = Math.max(maxY, sg.y + sg.height);
  }
  const offsetX = NODE_PADDING - minX;
  const offsetY = NODE_PADDING - minY;
  for (const node of nodeLayouts.values()) {
    node.x += offsetX;
    node.y += offsetY;
  }
  for (const sg of subgraphLayouts) {
    sg.x += offsetX;
    sg.y += offsetY;
  }
  for (const edge of edgeLayouts) {
    for (const point of edge.points) {
      point.x += offsetX;
      point.y += offsetY;
    }
  }
  const width = maxX - minX + NODE_PADDING * 2;
  const height = maxY - minY + NODE_PADDING * 2;
  return {
    width,
    height,
    nodes: Array.from(nodeLayouts.values()),
    edges: edgeLayouts,
    subgraphs: subgraphLayouts
  };
}

// src/renderer.ts
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderNodeShape(node, flowchartNode) {
  const { x, y, width, height } = node;
  const rx = 4;
  switch (flowchartNode.shape) {
    case "rounded":
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="20" ry="20" class="flowchart-node"/>`;
    case "diamond":
      const cx = x + width / 2;
      const cy = y + height / 2;
      const hw = width / 2;
      const hh = height / 2;
      return `<polygon points="${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}" class="flowchart-node"/>`;
    case "circle":
      const r = Math.min(width, height) / 2;
      return `<circle cx="${x + width / 2}" cy="${y + height / 2}" r="${r}" class="flowchart-node"/>`;
    case "rect":
    default:
      return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${rx}" class="flowchart-node"/>`;
  }
}
function renderNodeLabel(node, flowchartNode) {
  const { x, y, width, height } = node;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const lines = flowchartNode.label.split(/<br\s*\/?>/);
  if (lines.length === 1) {
    return `<text x="${cx}" y="${cy}" class="flowchart-node-label" dominant-baseline="middle" text-anchor="middle">${escapeHtml(lines[0])}</text>`;
  }
  const lineHeight = 14;
  const startY = cy - (lines.length - 1) * lineHeight / 2;
  return lines.map(
    (line, i) => `<text x="${cx}" y="${startY + i * lineHeight}" class="flowchart-node-label" dominant-baseline="middle" text-anchor="middle">${escapeHtml(line)}</text>`
  ).join("\n");
}
function renderEdge(edge) {
  if (edge.points.length < 2) return "";
  const [start, end] = edge.points;
  const dashArray = edge.style === "dashed" ? 'stroke-dasharray="5,5"' : "";
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const arrowSize = 8;
  const adjustedEnd = {
    x: end.x - Math.cos(angle) * arrowSize,
    y: end.y - Math.sin(angle) * arrowSize
  };
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  let path;
  if (Math.abs(dx) > Math.abs(dy)) {
    path = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${adjustedEnd.x} ${adjustedEnd.y}`;
  } else {
    path = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${adjustedEnd.x} ${adjustedEnd.y}`;
  }
  const arrowPath = `
    M ${end.x} ${end.y}
    L ${end.x - arrowSize * Math.cos(angle - Math.PI / 6)} ${end.y - arrowSize * Math.sin(angle - Math.PI / 6)}
    L ${end.x - arrowSize * Math.cos(angle + Math.PI / 6)} ${end.y - arrowSize * Math.sin(angle + Math.PI / 6)}
    Z
  `;
  let labelSvg = "";
  if (edge.label) {
    const labelX = midX;
    const labelY = midY - 8;
    labelSvg = `
      <rect x="${labelX - edge.label.length * 4}" y="${labelY - 10}"
            width="${edge.label.length * 8}" height="16"
            class="flowchart-edge-label-bg"/>
      <text x="${labelX}" y="${labelY}" class="flowchart-edge-label"
            dominant-baseline="middle" text-anchor="middle">${escapeHtml(edge.label)}</text>
    `;
  }
  return `
    <g class="flowchart-edge">
      <path d="${path}" class="flowchart-edge-path" ${dashArray}/>
      <path d="${arrowPath}" class="flowchart-edge-arrow"/>
      ${labelSvg}
    </g>
  `;
}
function renderSubgraph(subgraph) {
  const { x, y, width, height, label, style } = subgraph;
  let styleAttr = "";
  if (style) {
    const fill = style.fill || "none";
    const stroke = style.stroke || "#666";
    styleAttr = `fill="${fill}" stroke="${stroke}"`;
  }
  return `
    <g class="flowchart-subgraph">
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
            class="flowchart-subgraph-rect" rx="8" ry="8" ${styleAttr}/>
      <text x="${x + 10}" y="${y + 20}" class="flowchart-subgraph-label">${escapeHtml(label)}</text>
    </g>
  `;
}
function renderFlowchartSvg(flowchart, layout) {
  const { width, height, nodes, edges, subgraphs } = layout;
  const subgraphsSvg = subgraphs.map((sg) => renderSubgraph(sg)).join("\n");
  const edgesSvg = edges.map((edge) => renderEdge(edge)).join("\n");
  const nodesSvg = nodes.map((node) => {
    const flowchartNode = flowchart.nodes.get(node.id);
    return `
      <g class="flowchart-node-group" data-id="${node.id}">
        ${renderNodeShape(node, flowchartNode)}
        ${renderNodeLabel(node, flowchartNode)}
      </g>
    `;
  }).join("\n");
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
  `;
}

// src/index.ts
function renderFlowchart(source) {
  const flowchart = parseFlowchart(source);
  const layout = layoutFlowchart(flowchart);
  return renderFlowchartSvg(flowchart, layout);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  layoutFlowchart,
  parseFlowchart,
  renderFlowchart,
  renderFlowchartSvg
});
//# sourceMappingURL=index.cjs.map