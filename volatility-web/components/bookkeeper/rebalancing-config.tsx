import React from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Settings, Clock, AlertTriangle, Save } from 'lucide-react'

interface RebalancingConfigProps {
  autoRebalance: boolean
  rebalanceInterval: string
  maxDeviation: number
  onAutoRebalanceChange: (value: boolean) => void
  onIntervalChange: (value: string) => void
  onMaxDeviationChange: (value: number) => void
}

export function RebalancingConfig({
  autoRebalance,
  rebalanceInterval,
  maxDeviation,
  onAutoRebalanceChange,
  onIntervalChange,
  onMaxDeviationChange
}: RebalancingConfigProps) {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Settings className="w-5 h-5 mr-2" />
          <h3 className="text-lg font-medium">Auto-Rebalancing Settings</h3>
        </div>
        
        <div className="space-y-6">
          {/* Auto-rebalance toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-rebalance">Enable Auto-Rebalancing</Label>
              <p className="text-sm text-gray-500 mt-1">
                Automatically rebalance portfolio when Greeks deviate from targets
              </p>
            </div>
            <Switch
              id="auto-rebalance"
              checked={autoRebalance}
              onCheckedChange={onAutoRebalanceChange}
            />
          </div>

          {/* Rebalance interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Rebalance Interval</Label>
            <Select
              value={rebalanceInterval}
              onValueChange={onIntervalChange}
              disabled={!autoRebalance}
            >
              <SelectTrigger id="interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5m">Every 5 minutes</SelectItem>
                <SelectItem value="15m">Every 15 minutes</SelectItem>
                <SelectItem value="30m">Every 30 minutes</SelectItem>
                <SelectItem value="1h">Every hour</SelectItem>
                <SelectItem value="4h">Every 4 hours</SelectItem>
                <SelectItem value="1d">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max deviation */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="deviation">Maximum Deviation (%)</Label>
              <span className="text-sm text-gray-500">{maxDeviation}%</span>
            </div>
            <Slider
              id="deviation"
              value={[maxDeviation]}
              onValueChange={([value]) => onMaxDeviationChange(value)}
              min={1}
              max={50}
              step={1}
              disabled={!autoRebalance}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Trigger rebalancing when any Greek deviates by more than {maxDeviation}% from target
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <h3 className="text-lg font-medium">Risk Controls</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-trades">Max Trades per Rebalance</Label>
              <Input
                id="max-trades"
                type="number"
                defaultValue="10"
                disabled={!autoRebalance}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-cost">Max Cost per Rebalance ($)</Label>
              <Input
                id="max-cost"
                type="number"
                defaultValue="50000"
                disabled={!autoRebalance}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="position-limits">Position Limits</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Min position size"
                type="number"
                defaultValue="1"
                disabled={!autoRebalance}
              />
              <Input
                placeholder="Max position size"
                type="number"
                defaultValue="100"
                disabled={!autoRebalance}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 mr-2" />
          <h3 className="text-lg font-medium">Trading Hours</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Only rebalance during market hours</Label>
            <Switch defaultChecked disabled={!autoRebalance} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                defaultValue="09:30"
                disabled={!autoRebalance}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                defaultValue="16:00"
                disabled={!autoRebalance}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  )
}