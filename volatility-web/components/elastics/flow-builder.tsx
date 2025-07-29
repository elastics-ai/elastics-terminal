"use client";

import React, { useCallback, useState } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  MarkerType,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  RotateCcw, 
  Database,
  Zap,
  TrendingUp,
  AlertTriangle,
  Terminal,
  Sparkles,
  Briefcase,
  Download,
  Clock
} from "lucide-react";

const nodeTypes = {
  dataSource: ({ data }: any) => (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Data Source</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{data.label}</div>
    </div>
  ),
  function: ({ data }: any) => (
    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-medium text-gray-700">Function</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{data.label}</div>
    </div>
  ),
  strategy: ({ data }: any) => (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-gray-700">Strategy</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{data.label}</div>
    </div>
  ),
  risk: ({ data }: any) => (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 min-w-[180px]">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-600" />
        <span className="text-sm font-medium text-gray-700">Risk</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{data.label}</div>
    </div>
  ),
  execution: ({ data }: any) => (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 min-w-[150px]">
      <div className="flex items-center gap-2 mb-2">
        <Terminal className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Execution</span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{data.label}</div>
    </div>
  ),
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "dataSource",
    position: { x: 100, y: 100 },
    data: { label: "Kalshi" },
  },
  {
    id: "2",
    type: "dataSource",
    position: { x: 100, y: 220 },
    data: { label: "Polymarket" },
  },
  {
    id: "3",
    type: "dataSource",
    position: { x: 100, y: 340 },
    data: { label: "Deribit" },
  },
  {
    id: "4",
    type: "dataSource",
    position: { x: 100, y: 460 },
    data: { label: "Twitter" },
  },
  {
    id: "5",
    type: "function",
    position: { x: 350, y: 160 },
    data: { label: "Contract Matcher" },
  },
  {
    id: "6",
    type: "function",
    position: { x: 350, y: 280 },
    data: { label: "Implied Volatility" },
  },
  {
    id: "7",
    type: "function",
    position: { x: 350, y: 400 },
    data: { label: "Sentiment Analysis" },
  },
  {
    id: "8",
    type: "strategy",
    position: { x: 600, y: 220 },
    data: { label: "Market-Making-Strategy-01" },
  },
  {
    id: "9",
    type: "risk",
    position: { x: 600, y: 360 },
    data: { label: "Hedging-System-01" },
  },
  {
    id: "10",
    type: "execution",
    position: { x: 850, y: 290 },
    data: { label: "Engine-01" },
  },
];

const initialEdges: Edge[] = [
  { 
    id: "e1-5", 
    source: "1", 
    target: "5",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e2-5", 
    source: "2", 
    target: "5",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e3-6", 
    source: "3", 
    target: "6",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e4-7", 
    source: "4", 
    target: "7",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e5-8", 
    source: "5", 
    target: "8",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e6-8", 
    source: "6", 
    target: "8",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e7-8", 
    source: "7", 
    target: "8",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e8-9", 
    source: "8", 
    target: "9",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
  { 
    id: "e9-10", 
    source: "9", 
    target: "10",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#94a3b8" },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#94a3b8",
    },
  },
];

export function FlowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [activeTab, setActiveTab] = useState('builder');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
      },
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-semibold">
              Quant-Nexus-01{" "}
              <span className="text-sm text-muted-foreground ml-2">
                • Draft
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Backtest this Agent over the last 30 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              Critical
              <span className="text-xs text-muted-foreground">3</span>
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Warning
              <span className="text-xs text-muted-foreground">2</span>
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Info
              <span className="text-xs text-muted-foreground">4</span>
            </Badge>
            <span className="text-sm text-muted-foreground ml-4">
              <Clock className="w-4 h-4 inline mr-1" />
              09:11:43 UTC
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Review with AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Briefcase className="w-4 h-4" />
            Backtest
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            Execute
            <Play className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-border bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="builder">Builder</TabsTrigger>
            <TabsTrigger value="backtester">Backtester</TabsTrigger>
            <TabsTrigger value="trade-history">Trade History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          className="bg-muted/20"
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1} 
            color="#e5e7eb"
          />
          <Controls className="bg-card border-border" />
        </ReactFlow>
      </div>
    </div>
  );
}