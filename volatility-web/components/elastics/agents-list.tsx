"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const agents = [
  {
    id: "quant-nexus-01",
    name: "Quant-Nexus-01",
    status: "draft",
    lastModified: "2 hours ago",
  },
  {
    id: "market-maker-02",
    name: "Market Maker 02",
    status: "running",
    lastModified: "1 day ago",
  },
  {
    id: "volatility-arb-03",
    name: "Volatility Arb 03",
    status: "paused",
    lastModified: "3 days ago",
  },
  {
    id: "sentiment-alpha-04",
    name: "Sentiment Alpha 04",
    status: "draft",
    lastModified: "1 week ago",
  },
];

const statusColors = {
  draft: "bg-gray-400",
  running: "bg-green-400",
  paused: "bg-yellow-400",
  stopped: "bg-red-400",
};

export function AgentsList() {
  const [selectedAgent, setSelectedAgent] = useState("quant-nexus-01");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Agents</h2>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Agents List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className={cn(
              "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
              selectedAgent === agent.id && "bg-muted"
            )}
            onClick={() => setSelectedAgent(agent.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-sm">{agent.name}</h3>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      statusColors[agent.status as keyof typeof statusColors]
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Last modified {agent.lastModified}
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            Backtest All
          </Button>
          <Button variant="outline" size="sm">
            Stop All
          </Button>
        </div>
      </div>
    </div>
  );
}