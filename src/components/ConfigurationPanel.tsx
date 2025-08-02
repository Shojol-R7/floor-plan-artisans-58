import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Grid, Route, Ruler, Shield } from 'lucide-react';
import { PlacementConfig } from '@/types/floorplan';

interface ConfigurationPanelProps {
  config: PlacementConfig;
  onChange: (config: PlacementConfig) => void;
  disabled?: boolean;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onChange,
  disabled = false
}) => {
  const handleLayoutProfileChange = (value: number[]) => {
    onChange({ ...config, layoutProfile: value[0] as 10 | 25 | 30 | 35 });
  };

  const handleCorridorWidthChange = (value: number[]) => {
    onChange({ ...config, corridorWidth: value[0] });
  };

  const handleMinSpacingChange = (value: number[]) => {
    onChange({ ...config, minIlotSpacing: value[0] });
  };

  const handleMaxSizeChange = (value: number[]) => {
    onChange({ ...config, maxIlotSize: value[0] });
  };

  const handleWallTouchingChange = (checked: boolean) => {
    onChange({ ...config, allowWallTouching: checked });
  };

  const handleEntranceClearanceChange = (checked: boolean) => {
    onChange({ ...config, respectEntranceClearance: checked });
  };

  const getLayoutProfileLabel = (profile: number) => {
    switch (profile) {
      case 10: return 'Minimal (10%)';
      case 25: return 'Standard (25%)';
      case 30: return 'Dense (30%)';
      case 35: return 'Maximum (35%)';
      default: return 'Custom';
    }
  };

  const getLayoutProfileDescription = (profile: number) => {
    switch (profile) {
      case 10: return 'Sparse layout with maximum circulation space';
      case 25: return 'Balanced layout for general retail spaces';
      case 30: return 'Efficient layout for high-traffic areas';
      case 35: return 'Maximum utilization for premium spaces';
      default: return 'Custom configuration';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration
        </CardTitle>
        <CardDescription>
          Professional layout parameters for optimal space utilization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Profile */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            <Label className="font-semibold">Layout Density</Label>
            <Badge variant="outline">
              {getLayoutProfileLabel(config.layoutProfile)}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <Slider
              value={[config.layoutProfile]}
              onValueChange={handleLayoutProfileChange}
              min={10}
              max={35}
              step={5}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10%</span>
              <span>25%</span>
              <span>30%</span>
              <span>35%</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {getLayoutProfileDescription(config.layoutProfile)}
          </p>
        </div>

        <Separator />

        {/* Corridor Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            <Label className="font-semibold">Corridor Configuration</Label>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">Corridor Width</Label>
                <Badge variant="secondary">{config.corridorWidth.toFixed(1)}m</Badge>
              </div>
              <Slider
                value={[config.corridorWidth]}
                onValueChange={handleCorridorWidthChange}
                min={0.8}
                max={2.5}
                step={0.1}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0.8m</span>
                <span>1.2m (Default)</span>
                <span>2.5m</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Spacing Controls */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            <Label className="font-semibold">Spacing Controls</Label>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">Minimum Îlot Spacing</Label>
                <Badge variant="secondary">{config.minIlotSpacing.toFixed(1)}m</Badge>
              </div>
              <Slider
                value={[config.minIlotSpacing]}
                onValueChange={handleMinSpacingChange}
                min={0.5}
                max={2.0}
                step={0.1}
                disabled={disabled}
                className="w-full"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm">Maximum Îlot Size</Label>
                <Badge variant="secondary">{config.maxIlotSize.toFixed(1)}m</Badge>
              </div>
              <Slider
                value={[config.maxIlotSize]}
                onValueChange={handleMaxSizeChange}
                min={2.0}
                max={6.0}
                step={0.5}
                disabled={disabled}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Constraint Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <Label className="font-semibold">Architectural Constraints</Label>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">Allow Wall Contact</Label>
                <p className="text-xs text-muted-foreground">
                  Permit îlots to touch perimeter walls
                </p>
              </div>
              <Switch
                checked={config.allowWallTouching}
                onCheckedChange={handleWallTouchingChange}
                disabled={disabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">Entrance Clearance</Label>
                <p className="text-xs text-muted-foreground">
                  Maintain clearance zones around entrances
                </p>
              </div>
              <Switch
                checked={config.respectEntranceClearance}
                onCheckedChange={handleEntranceClearanceChange}
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        {/* Professional Notes */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">PROFESSIONAL STANDARDS</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Minimum 1.2m corridor width for accessibility compliance</li>
            <li>• 3m clearance maintained around emergency exits</li>
            <li>• Îlot placement optimized for traffic flow patterns</li>
            <li>• All measurements conform to architectural standards</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};