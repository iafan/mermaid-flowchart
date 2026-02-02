export {
  parseFlowchart,
  Direction,
  FlowchartNode,
  FlowchartEdge,
  FlowchartSubgraph,
  Flowchart,
} from './parser'

export {
  layoutFlowchart,
  NodeLayout,
  EdgeLayout,
  SubgraphLayout,
  FlowchartLayout,
} from './layout'

export { renderFlowchartSvg } from './renderer'

import { parseFlowchart } from './parser'
import { layoutFlowchart } from './layout'
import { renderFlowchartSvg } from './renderer'

/**
 * Parse Mermaid flowchart syntax and render as SVG.
 * @param source - Mermaid flowchart source string
 * @returns SVG string with CSS variable-based theming
 */
export function renderFlowchart(source: string): string {
  const flowchart = parseFlowchart(source)
  const layout = layoutFlowchart(flowchart)
  return renderFlowchartSvg(flowchart, layout)
}
