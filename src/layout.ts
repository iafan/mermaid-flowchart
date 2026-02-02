import type { Flowchart, Direction, FlowchartSubgraph } from './parser'

export interface NodeLayout {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface EdgeLayout {
  from: string
  to: string
  label?: string
  style: 'solid' | 'dashed'
  points: Array<{ x: number; y: number }>
}

export interface SubgraphLayout {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
  style?: Record<string, string>
}

export interface FlowchartLayout {
  width: number
  height: number
  nodes: NodeLayout[]
  edges: EdgeLayout[]
  subgraphs: SubgraphLayout[]
}

const NODE_WIDTH = 150
const NODE_HEIGHT = 50
const NODE_PADDING = 30
const SUBGRAPH_PADDING = 40
const SUBGRAPH_HEADER = 30

interface NodeRank {
  id: string
  rank: number
  order: number
}

function computeRanks(flowchart: Flowchart): Map<string, NodeRank> {
  const ranks = new Map<string, NodeRank>()
  const nodeIds = Array.from(flowchart.nodes.keys())

  // Build adjacency list
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, string[]>()

  for (const id of nodeIds) {
    outgoing.set(id, [])
    incoming.set(id, [])
  }

  for (const edge of flowchart.edges) {
    outgoing.get(edge.from)?.push(edge.to)
    incoming.get(edge.to)?.push(edge.from)
  }

  // Find nodes with no incoming edges (roots)
  const roots = nodeIds.filter(id => incoming.get(id)?.length === 0)
  if (roots.length === 0 && nodeIds.length > 0) {
    roots.push(nodeIds[0])
  }

  // BFS to assign ranks
  const visited = new Set<string>()
  const queue: Array<{ id: string; rank: number }> = roots.map(id => ({ id, rank: 0 }))

  while (queue.length > 0) {
    const { id, rank } = queue.shift()!

    if (visited.has(id)) {
      const existing = ranks.get(id)
      if (existing && rank > existing.rank) {
        existing.rank = rank
      }
      continue
    }

    visited.add(id)
    ranks.set(id, { id, rank, order: 0 })

    for (const next of outgoing.get(id) || []) {
      queue.push({ id: next, rank: rank + 1 })
    }
  }

  // Handle any disconnected nodes
  for (const id of nodeIds) {
    if (!ranks.has(id)) {
      ranks.set(id, { id, rank: 0, order: 0 })
    }
  }

  // Assign order within each rank
  const rankGroups = new Map<number, string[]>()
  for (const [id, info] of ranks) {
    const group = rankGroups.get(info.rank) || []
    group.push(id)
    rankGroups.set(info.rank, group)
  }

  for (const [, group] of rankGroups) {
    group.forEach((id, index) => {
      const info = ranks.get(id)!
      info.order = index
    })
  }

  return ranks
}

function layoutSubgraph(
  subgraph: FlowchartSubgraph,
  nodeLayouts: Map<string, NodeLayout>,
  direction: Direction
): SubgraphLayout {
  if (subgraph.nodeIds.length === 0) {
    return {
      id: subgraph.id,
      label: subgraph.label,
      x: 0,
      y: 0,
      width: NODE_WIDTH + SUBGRAPH_PADDING * 2,
      height: NODE_HEIGHT + SUBGRAPH_PADDING * 2 + SUBGRAPH_HEADER,
      style: subgraph.style,
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const nodeId of subgraph.nodeIds) {
    const node = nodeLayouts.get(nodeId)
    if (node) {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + node.width)
      maxY = Math.max(maxY, node.y + node.height)
    }
  }

  return {
    id: subgraph.id,
    label: subgraph.label,
    x: minX - SUBGRAPH_PADDING,
    y: minY - SUBGRAPH_PADDING - SUBGRAPH_HEADER,
    width: maxX - minX + SUBGRAPH_PADDING * 2,
    height: maxY - minY + SUBGRAPH_PADDING * 2 + SUBGRAPH_HEADER,
    style: subgraph.style,
  }
}

export function layoutFlowchart(flowchart: Flowchart): FlowchartLayout {
  const ranks = computeRanks(flowchart)
  const nodeLayouts = new Map<string, NodeLayout>()
  const direction = flowchart.direction

  // Group nodes by subgraph for layout purposes
  const subgraphNodeIds = new Set<string>()
  for (const sg of flowchart.subgraphs) {
    for (const id of sg.nodeIds) {
      subgraphNodeIds.add(id)
    }
  }

  // Count nodes per rank
  const rankCounts = new Map<number, number>()
  for (const info of ranks.values()) {
    rankCounts.set(info.rank, (rankCounts.get(info.rank) || 0) + 1)
  }

  // Position nodes based on rank and order
  const isVertical = direction === 'TB' || direction === 'BT'
  const isReversed = direction === 'BT' || direction === 'RL'

  for (const [id, info] of ranks) {
    const node = flowchart.nodes.get(id)!
    const rankCount = rankCounts.get(info.rank) || 1

    let x: number, y: number
    const rankSpacing = NODE_HEIGHT + NODE_PADDING * 2
    const orderSpacing = NODE_WIDTH + NODE_PADDING

    if (isVertical) {
      x = info.order * orderSpacing + (NODE_PADDING / 2)
      y = info.rank * rankSpacing + NODE_PADDING
      if (isReversed) {
        const maxRank = Math.max(...Array.from(ranks.values()).map(r => r.rank))
        y = (maxRank - info.rank) * rankSpacing + NODE_PADDING
      }
    } else {
      x = info.rank * (NODE_WIDTH + NODE_PADDING * 2) + NODE_PADDING
      y = info.order * rankSpacing + NODE_PADDING
      if (isReversed) {
        const maxRank = Math.max(...Array.from(ranks.values()).map(r => r.rank))
        x = (maxRank - info.rank) * (NODE_WIDTH + NODE_PADDING * 2) + NODE_PADDING
      }
    }

    nodeLayouts.set(id, {
      id,
      x,
      y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  }

  // Layout subgraphs and adjust node positions
  const subgraphLayouts: SubgraphLayout[] = []

  // Process subgraphs and offset their nodes
  let subgraphOffsetY = 0
  for (const subgraph of flowchart.subgraphs) {
    // First compute subgraph bounds
    const sgLayout = layoutSubgraph(subgraph, nodeLayouts, direction)

    // Offset all nodes in this subgraph
    const offsetY = subgraphOffsetY - sgLayout.y + NODE_PADDING
    for (const nodeId of subgraph.nodeIds) {
      const node = nodeLayouts.get(nodeId)
      if (node) {
        node.y += offsetY
      }
    }

    // Recompute subgraph layout after offset
    const finalLayout = layoutSubgraph(subgraph, nodeLayouts, direction)
    subgraphLayouts.push(finalLayout)

    subgraphOffsetY = finalLayout.y + finalLayout.height + NODE_PADDING
  }

  // Create edge layouts
  const edgeLayouts: EdgeLayout[] = flowchart.edges.map(edge => {
    const fromNode = nodeLayouts.get(edge.from)
    const toNode = nodeLayouts.get(edge.to)

    if (!fromNode || !toNode) {
      return {
        from: edge.from,
        to: edge.to,
        label: edge.label,
        style: edge.style,
        points: [],
      }
    }

    // Simple direct connection
    const fromCenter = {
      x: fromNode.x + fromNode.width / 2,
      y: fromNode.y + fromNode.height / 2,
    }
    const toCenter = {
      x: toNode.x + toNode.width / 2,
      y: toNode.y + toNode.height / 2,
    }

    // Determine connection points based on relative position
    let startPoint: { x: number; y: number }
    let endPoint: { x: number; y: number }

    if (isVertical) {
      if (fromCenter.y < toCenter.y) {
        startPoint = { x: fromCenter.x, y: fromNode.y + fromNode.height }
        endPoint = { x: toCenter.x, y: toNode.y }
      } else {
        startPoint = { x: fromCenter.x, y: fromNode.y }
        endPoint = { x: toCenter.x, y: toNode.y + toNode.height }
      }
    } else {
      if (fromCenter.x < toCenter.x) {
        startPoint = { x: fromNode.x + fromNode.width, y: fromCenter.y }
        endPoint = { x: toNode.x, y: toCenter.y }
      } else {
        startPoint = { x: fromNode.x, y: fromCenter.y }
        endPoint = { x: toNode.x + toNode.width, y: toCenter.y }
      }
    }

    return {
      from: edge.from,
      to: edge.to,
      label: edge.label,
      style: edge.style,
      points: [startPoint, endPoint],
    }
  })

  // Find minimum coordinates across all elements
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const node of nodeLayouts.values()) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }
  for (const sg of subgraphLayouts) {
    minX = Math.min(minX, sg.x)
    minY = Math.min(minY, sg.y)
    maxX = Math.max(maxX, sg.x + sg.width)
    maxY = Math.max(maxY, sg.y + sg.height)
  }

  // Normalize: shift everything so minimum is at NODE_PADDING
  const offsetX = NODE_PADDING - minX
  const offsetY = NODE_PADDING - minY

  for (const node of nodeLayouts.values()) {
    node.x += offsetX
    node.y += offsetY
  }
  for (const sg of subgraphLayouts) {
    sg.x += offsetX
    sg.y += offsetY
  }
  for (const edge of edgeLayouts) {
    for (const point of edge.points) {
      point.x += offsetX
      point.y += offsetY
    }
  }

  // Recompute dimensions after normalization
  const width = maxX - minX + NODE_PADDING * 2
  const height = maxY - minY + NODE_PADDING * 2

  return {
    width,
    height,
    nodes: Array.from(nodeLayouts.values()),
    edges: edgeLayouts,
    subgraphs: subgraphLayouts,
  }
}
