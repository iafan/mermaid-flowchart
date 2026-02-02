export type Direction = 'TB' | 'BT' | 'LR' | 'RL'

export interface FlowchartNode {
  id: string
  label: string
  shape: 'rect' | 'rounded' | 'diamond' | 'circle'
}

export interface FlowchartEdge {
  from: string
  to: string
  label?: string
  style: 'solid' | 'dashed'
}

export interface FlowchartSubgraph {
  id: string
  label: string
  nodeIds: string[]
  style?: Record<string, string>
}

export interface Flowchart {
  direction: Direction
  nodes: Map<string, FlowchartNode>
  edges: FlowchartEdge[]
  subgraphs: FlowchartSubgraph[]
}

function parseNodeDefinition(text: string): { id: string; label: string; shape: FlowchartNode['shape'] } | null {
  // Match: ID[label], ID(label), ID{label}, ID((label))
  const patterns: Array<{ regex: RegExp; shape: FlowchartNode['shape'] }> = [
    { regex: /^(\w+)\[\[(.+)\]\]$/, shape: 'rect' },      // [[label]] - subroutine
    { regex: /^(\w+)\[(.+)\]$/, shape: 'rect' },          // [label] - rectangle
    { regex: /^(\w+)\((.+)\)$/, shape: 'rounded' },       // (label) - rounded
    { regex: /^(\w+)\(\((.+)\)\)$/, shape: 'circle' },    // ((label)) - circle
    { regex: /^(\w+)\{(.+)\}$/, shape: 'diamond' },       // {label} - diamond
  ]

  for (const { regex, shape } of patterns) {
    const match = text.match(regex)
    if (match) {
      return { id: match[1], label: match[2], shape }
    }
  }

  // Plain ID with no shape
  const plainMatch = text.match(/^(\w+)$/)
  if (plainMatch) {
    return { id: plainMatch[1], label: plainMatch[1], shape: 'rect' }
  }

  return null
}

interface EdgeParseResult {
  from: string
  to: string
  label?: string
  style: 'solid' | 'dashed'
  // Only set if the node has an actual definition (not just an ID reference)
  fromNode?: FlowchartNode
  toNode?: FlowchartNode
}

function parseEdge(line: string): EdgeParseResult | null {
  // Patterns for edges with optional labels
  // A --> B, A -->|label| B, A -.-> B, A -.->|label| B
  const edgePatterns = [
    /^(.+?)\s*-->\|"?([^"|]+)"?\|\s*(.+)$/,    // -->|label|
    /^(.+?)\s*-\.->\|"?([^"|]+)"?\|\s*(.+)$/,  // -.->|label|
    /^(.+?)\s*-->\s*(.+)$/,                     // -->
    /^(.+?)\s*-\.->\s*(.+)$/,                   // -.->
  ]

  for (let i = 0; i < edgePatterns.length; i++) {
    const match = line.match(edgePatterns[i])
    if (match) {
      const hasLabel = i < 2
      const style: 'solid' | 'dashed' = i === 1 || i === 3 ? 'dashed' : 'solid'

      let fromPart: string, toPart: string, label: string | undefined

      if (hasLabel) {
        fromPart = match[1].trim()
        label = match[2].trim()
        toPart = match[3].trim()
      } else {
        fromPart = match[1].trim()
        toPart = match[2].trim()
      }

      // Parse the from and to parts - they might include node definitions
      const fromNode = parseNodeDefinition(fromPart)
      const toNode = parseNodeDefinition(toPart)

      if (fromNode && toNode) {
        const result: EdgeParseResult = {
          from: fromNode.id,
          to: toNode.id,
          label,
          style,
        }

        // Only include node definitions if they have actual labels (not just ID references)
        if (fromNode.label !== fromNode.id) {
          result.fromNode = fromNode
        }
        if (toNode.label !== toNode.id) {
          result.toNode = toNode
        }

        return result
      }
    }
  }

  return null
}

function parseStyle(line: string): { id: string; styles: Record<string, string> } | null {
  const match = line.match(/^style\s+(\w+)\s+(.+)$/)
  if (!match) return null

  const id = match[1]
  const styleStr = match[2]
  const styles: Record<string, string> = {}

  // Parse comma-separated style properties
  const parts = styleStr.split(',')
  for (const part of parts) {
    const [key, value] = part.split(':').map(s => s.trim())
    if (key && value) {
      styles[key] = value
    }
  }

  return { id, styles }
}

export function parseFlowchart(source: string): Flowchart {
  const lines = source.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%%'))

  const flowchart: Flowchart = {
    direction: 'TB',
    nodes: new Map(),
    edges: [],
    subgraphs: [],
  }

  // Parse direction from first line
  const firstLine = lines[0]
  const dirMatch = firstLine?.match(/^flowchart\s+(TB|BT|LR|RL)$/i)
  if (dirMatch) {
    flowchart.direction = dirMatch[1].toUpperCase() as Direction
    lines.shift()
  } else if (firstLine?.startsWith('flowchart')) {
    flowchart.direction = 'TB'
    lines.shift()
  }

  // Track subgraph parsing state
  let currentSubgraph: FlowchartSubgraph | null = null
  const subgraphStack: FlowchartSubgraph[] = []
  const nodeToSubgraph = new Map<string, string>()

  for (const line of lines) {
    // Subgraph start
    const subgraphMatch = line.match(/^subgraph\s+(\w+)(?:\["([^"]+)"\])?$/)
    if (subgraphMatch) {
      const subgraph: FlowchartSubgraph = {
        id: subgraphMatch[1],
        label: subgraphMatch[2] || subgraphMatch[1],
        nodeIds: [],
      }
      if (currentSubgraph) {
        subgraphStack.push(currentSubgraph)
      }
      currentSubgraph = subgraph
      flowchart.subgraphs.push(subgraph)
      continue
    }

    // Subgraph end
    if (line === 'end') {
      currentSubgraph = subgraphStack.pop() || null
      continue
    }

    // Style directive
    const styleResult = parseStyle(line)
    if (styleResult) {
      const subgraph = flowchart.subgraphs.find(s => s.id === styleResult.id)
      if (subgraph) {
        subgraph.style = styleResult.styles
      }
      continue
    }

    // Try to parse as edge
    const edgeResult = parseEdge(line)
    if (edgeResult) {
      // Handle 'from' node: use inline definition if present, otherwise create placeholder if missing
      if (edgeResult.fromNode) {
        flowchart.nodes.set(edgeResult.fromNode.id, edgeResult.fromNode)
      } else if (!flowchart.nodes.has(edgeResult.from)) {
        flowchart.nodes.set(edgeResult.from, {
          id: edgeResult.from,
          label: edgeResult.from,
          shape: 'rect',
        })
      }

      // Handle 'to' node: use inline definition if present, otherwise create placeholder if missing
      if (edgeResult.toNode) {
        flowchart.nodes.set(edgeResult.toNode.id, edgeResult.toNode)
      } else if (!flowchart.nodes.has(edgeResult.to)) {
        flowchart.nodes.set(edgeResult.to, {
          id: edgeResult.to,
          label: edgeResult.to,
          shape: 'rect',
        })
      }

      // Track nodes in current subgraph
      if (currentSubgraph) {
        if (!nodeToSubgraph.has(edgeResult.from)) {
          currentSubgraph.nodeIds.push(edgeResult.from)
          nodeToSubgraph.set(edgeResult.from, currentSubgraph.id)
        }
        if (!nodeToSubgraph.has(edgeResult.to)) {
          currentSubgraph.nodeIds.push(edgeResult.to)
          nodeToSubgraph.set(edgeResult.to, currentSubgraph.id)
        }
      }

      flowchart.edges.push({
        from: edgeResult.from,
        to: edgeResult.to,
        label: edgeResult.label,
        style: edgeResult.style,
      })
      continue
    }

    // Try to parse as standalone node definition
    const nodeResult = parseNodeDefinition(line)
    if (nodeResult) {
      flowchart.nodes.set(nodeResult.id, {
        id: nodeResult.id,
        label: nodeResult.label,
        shape: nodeResult.shape,
      })

      if (currentSubgraph && !nodeToSubgraph.has(nodeResult.id)) {
        currentSubgraph.nodeIds.push(nodeResult.id)
        nodeToSubgraph.set(nodeResult.id, currentSubgraph.id)
      }
    }
  }

  return flowchart
}
