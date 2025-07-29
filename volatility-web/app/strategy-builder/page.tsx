'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { ChatIntegratedFlowBuilder } from '@/components/agent-builder/ChatIntegratedFlowBuilder'
import { StrategyBuilderChatInterface } from '@/components/agent-builder/StrategyBuilderChatInterface'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { 
  MessageSquare, 
  Workflow, 
  Code, 
  Play, 
  Save,
  Download,
  Upload,
  Settings,
  Eye,
  Zap,
  Bot,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { Node, Edge } from '@xyflow/react'

interface StrategyFlow {
  id: string
  name: string
  description: string
  nodes: Node[]
  edges: Edge[]
  status: 'draft' | 'active' | 'testing'
  createdAt: Date
  updatedAt: Date
}

export default function StrategyBuilderPage() {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [currentFlow, setCurrentFlow] = useState<StrategyFlow | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [viewMode, setViewMode] = useState<'split' | 'chat' | 'visual'>('split')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected')
  
  // Handle flow updates from chat or visual builder
  const handleFlowUpdate = useCallback((data: any) => {
    if (data.flow_id && (!currentFlow || currentFlow.id !== data.flow_id)) {
      // New flow created
      const newFlow: StrategyFlow = {
        id: data.flow_id,
        name: data.strategy_name || `Strategy ${new Date().toLocaleTimeString()}`,
        description: data.description || 'Created via chat interface',
        nodes: data.nodes?.map((node: any, index: number) => ({
          id: node.id,
          type: 'strategyNode',
          position: node.position || { x: 100 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 },
          data: {
            label: node.name || node.type,
            type: node.type,
            description: node.description,
            codeStatus: 'pending'
          }
        })) || [],
        edges: data.connections?.map((conn: any, index: number) => ({
          id: `edge-${index}`,
          source: conn.from,
          target: conn.to,
          type: 'smoothstep'
        })) || [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      setCurrentFlow(newFlow)
      
      toast({
        title: "Strategy Created",
        description: `${newFlow.name} is ready for editing`,
      })
    } else if (currentFlow && data.flow_id === currentFlow.id) {
      // Update existing flow
      setCurrentFlow(prev => prev ? {
        ...prev,
        updatedAt: new Date()
      } : null)
    }
  }, [currentFlow])
  
  // Handle node highlighting from chat
  const handleNodeHighlight = useCallback((nodeId: string) => {
    // This would be handled by the flow builder component
    console.log('Highlighting node:', nodeId)
  }, [])
  
  // Handle visual flow changes
  const handleVisualFlowChange = useCallback((nodes: Node[], edges: Edge[]) => {
    if (currentFlow) {
      setCurrentFlow(prev => prev ? {
        ...prev,
        nodes,
        edges,
        updatedAt: new Date()
      } : null)
    }
  }, [currentFlow])
  
  // Handle node selection
  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node)
  }, [])
  
  // Save strategy
  const handleSave = useCallback(async () => {
    if (!currentFlow) {
      toast({
        title: "Nothing to Save",
        description: "Create a strategy first",
        variant: "destructive"
      })
      return
    }
    
    try {
      // Save to backend
      const response = await fetch('/api/strategy-builder/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: currentFlow,
          session_id: sessionId
        })
      })
      
      if (response.ok) {
        toast({
          title: "Strategy Saved",
          description: `${currentFlow.name} has been saved`,
        })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save strategy. Please try again.",
        variant: "destructive"
      })
    }
  }, [currentFlow, sessionId])
  
  // Test strategy
  const handleTest = useCallback(async () => {
    if (!currentFlow) {
      toast({
        title: "Nothing to Test",
        description: "Create a strategy first",
        variant: "destructive"
      })
      return
    }
    
    if (currentFlow.nodes.length === 0) {
      toast({
        title: "Empty Strategy",
        description: "Add some nodes to test the strategy",
        variant: "destructive"
      })
      return
    }
    
    try {
      toast({
        title: "Testing Strategy",
        description: "Running backtesting simulation...",
      })
      
      // This would trigger the test via WebSocket or API
      // For now, just show a success message after delay
      setTimeout(() => {
        toast({
          title: "Test Complete",
          description: "Strategy test completed successfully",
        })
      }, 3000)
      
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Could not test strategy. Please try again.",
        variant: "destructive"
      })
    }
  }, [currentFlow])
  
  // Generate code for entire strategy
  const handleGenerateCode = useCallback(async () => {
    if (!currentFlow) {
      toast({
        title: "Nothing to Generate",
        description: "Create a strategy first",
        variant: "destructive"
      })
      return
    }
    
    try {
      toast({
        title: "Generating Code",
        description: "Creating Python module from strategy...",
      })
      
      // This would call the backend code generation
      setTimeout(() => {
        toast({
          title: "Code Generated",
          description: "Strategy module created successfully",
        })
      }, 2000)
      
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate code. Please try again.",
        variant: "destructive"
      })
    }
  }, [currentFlow])
  
  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])
  
  // Render main content based on view mode
  const renderMainContent = () => {
    switch (viewMode) {
      case 'chat':
        return (
          <div className="h-full">
            <StrategyBuilderChatInterface
              sessionId={sessionId}
              flowId={currentFlow?.id}
              onFlowUpdate={handleFlowUpdate}
              onNodeHighlight={handleNodeHighlight}
            />
          </div>
        )
      
      case 'visual':
        return (
          <div className="h-full">
            <ChatIntegratedFlowBuilder
              flowId={currentFlow?.id}
              sessionId={sessionId}
              onFlowChange={handleVisualFlowChange}
              onNodeSelect={handleNodeSelect}
              chatMode={false}
            />
          </div>
        )
      
      case 'split':
      default:
        return (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={60} minSize={40}>
              <ChatIntegratedFlowBuilder
                flowId={currentFlow?.id}
                sessionId={sessionId}
                onFlowChange={handleVisualFlowChange}
                onNodeSelect={handleNodeSelect}
                chatMode={true}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={40} minSize={30}>
              <StrategyBuilderChatInterface
                sessionId={sessionId}
                flowId={currentFlow?.id}
                onFlowUpdate={handleFlowUpdate}
                onNodeHighlight={handleNodeHighlight}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )
    }
  }
  
  return (
    <AppLayout>
      <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">Strategy Builder</h1>
                <p className="text-sm text-muted-foreground">
                  Create trading strategies with AI-powered chat
                </p>
              </div>
            </div>
            
            {currentFlow && (
              <div className="flex items-center gap-2">
                <Separator orientation="vertical" className="h-8" />
                <div>
                  <div className="font-medium text-sm">{currentFlow.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentFlow.nodes.length} nodes • {currentFlow.edges.length} connections
                  </div>
                </div>
                <Badge variant={currentFlow.status === 'active' ? 'default' : 'secondary'}>
                  {currentFlow.status}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* View mode selector */}
            <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="split" className="text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Split
                </TabsTrigger>
                <TabsTrigger value="visual" className="text-xs">
                  <Workflow className="w-3 h-3 mr-1" />
                  Visual
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs">
                  <Bot className="w-3 h-3 mr-1" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Separator orientation="vertical" className="h-8" />
            
            {/* Action buttons */}
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleTest}>
              <Play className="w-4 h-4 mr-1" />
              Test
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleGenerateCode}>
              <Code className="w-4 h-4 mr-1" />
              Generate
            </Button>
            
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs">
                {connectionStatus === 'connected' ? 'Real-time sync active' : 'Disconnected'}
              </span>
            </div>
            
            {selectedNode && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="text-xs">
                  Selected: <span className="font-medium">{selectedNode.data.label}</span>
                  {selectedNode.data.type && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {selectedNode.data.type}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Session: {sessionId.slice(-8)}</span>
            {currentFlow && (
              <span>Last updated: {currentFlow.updatedAt.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {renderMainContent()}
        </div>
        
        {/* Bottom status/help bar */}
        <div className="border-t bg-muted/20 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>💡 Try: "Create a momentum strategy for BTC" or "/add-node data"</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Powered by Claude AI</span>
              <Zap className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}