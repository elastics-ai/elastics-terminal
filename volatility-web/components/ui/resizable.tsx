"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Simple resizable panels implementation without dependencies
// This is a basic fallback to replace the missing resizable panels component

interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "horizontal" | "vertical"
}

interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultSize?: number
  minSize?: number
}

export function ResizablePanelGroup({
  direction = "horizontal",
  className,
  children,
  ...props
}: ResizablePanelGroupProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "horizontal" ? "flex-row" : "flex-col",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function ResizablePanel({
  defaultSize = 50,
  minSize = 20,
  className,
  children,
  ...props
}: ResizablePanelProps) {
  return (
    <div
      className={cn("flex-1", className)}
      style={{ flexBasis: `${defaultSize}%`, minWidth: `${minSize}%` }}
      {...props}
    >
      {children}
    </div>
  )
}

export function ResizableHandle({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-border hover:bg-accent w-1 cursor-col-resize transition-colors",
        className
      )}
      {...props}
    />
  )
}