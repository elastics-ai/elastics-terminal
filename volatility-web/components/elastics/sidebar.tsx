"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  Database,
  Package,
  FileBarChart,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
  Shield,
  BarChart3,
  GitBranch,
  BookOpen,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { name: "SSVi Surface", href: "/elastics", icon: LayoutDashboard },
      { name: "Add Module", href: "/elastics/modules", icon: Package, badge: "+", badgeColor: "bg-green-500" },
    ],
  },
  {
    title: "Markets", 
    items: [
      { name: "Market IV", href: "/elastics/market", icon: TrendingUp, badge: "3", badgeColor: "bg-orange-500" },
      { name: "Select Underlying", href: "/elastics/underlying", icon: BarChart3 },
    ],
  },
  {
    title: "Model",
    items: [
      { name: "SSVI", href: "/elastics/models/ssvi", icon: Zap },
      { name: "SSVI2", href: "/elastics/models/ssvi2", icon: Zap },
      { name: "LSTM", href: "/elastics/models/lstm", icon: GitBranch },
      { name: "Linear", href: "/elastics/models/linear", icon: FileBarChart },
    ],
  },
  {
    title: "Show Data",
    items: [
      { name: "Deribit", href: "/elastics/data/deribit", icon: Database },
      { name: "Kaiko", href: "/elastics/data/kaiko", icon: Database },
      { name: "Paradigm", href: "/elastics/data/paradigm", icon: Database },
      { name: "Portfolio only", href: "/elastics/data/portfolio", icon: FolderOpen },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { name: "Documentation", href: "/docs", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function ElasticsSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-semibold text-gray-900">Elastics</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            {!isCollapsed && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === "/elastics" && pathname.startsWith("/elastics") && item.href !== pathname);
                const Icon = item.icon;
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group",
                        isActive
                          ? "bg-green-50 text-green-700"
                          : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 flex-shrink-0",
                        isActive ? "text-green-600" : "text-gray-500"
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="text-sm font-medium">{item.name}</span>
                          {item.badge && (
                            <span className={cn(
                              "ml-auto px-2 py-0.5 text-xs font-medium rounded-full text-white",
                              item.badgeColor || "bg-gray-500"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {isCollapsed && item.badge && (
                        <span className={cn(
                          "absolute -top-1 -right-1 w-5 h-5 text-xs font-medium rounded-full text-white flex items-center justify-center",
                          item.badgeColor || "bg-gray-500"
                        )}>
                          {item.badge}
                        </span>
                      )}
                      {isCollapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 py-3 px-3">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0 text-gray-500" />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}