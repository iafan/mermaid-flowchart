type Direction = 'TB' | 'BT' | 'LR' | 'RL';
interface FlowchartNode {
    id: string;
    label: string;
    shape: 'rect' | 'rounded' | 'diamond' | 'circle';
}
interface FlowchartEdge {
    from: string;
    to: string;
    label?: string;
    style: 'solid' | 'dashed';
}
interface FlowchartSubgraph {
    id: string;
    label: string;
    nodeIds: string[];
    style?: Record<string, string>;
}
interface Flowchart {
    direction: Direction;
    nodes: Map<string, FlowchartNode>;
    edges: FlowchartEdge[];
    subgraphs: FlowchartSubgraph[];
}
declare function parseFlowchart(source: string): Flowchart;

interface NodeLayout {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
interface EdgeLayout {
    from: string;
    to: string;
    label?: string;
    style: 'solid' | 'dashed';
    points: Array<{
        x: number;
        y: number;
    }>;
}
interface SubgraphLayout {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    style?: Record<string, string>;
}
interface FlowchartLayout {
    width: number;
    height: number;
    nodes: NodeLayout[];
    edges: EdgeLayout[];
    subgraphs: SubgraphLayout[];
}
declare function layoutFlowchart(flowchart: Flowchart): FlowchartLayout;

declare function renderFlowchartSvg(flowchart: Flowchart, layout: FlowchartLayout): string;

/**
 * Parse Mermaid flowchart syntax and render as SVG.
 * @param source - Mermaid flowchart source string
 * @returns SVG string with CSS variable-based theming
 */
declare function renderFlowchart(source: string): string;

export { type Direction, type EdgeLayout, type Flowchart, type FlowchartEdge, type FlowchartLayout, type FlowchartNode, type FlowchartSubgraph, type NodeLayout, type SubgraphLayout, layoutFlowchart, parseFlowchart, renderFlowchart, renderFlowchartSvg };
