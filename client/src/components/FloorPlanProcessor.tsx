import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Zap, Grid, Route, Download, Play, Pause, RotateCcw } from 'lucide-react';
import { FloorPlan, PlacementConfig, ProcessingStage, AnalysisResult } from '@/types/floorplan';
import { AdvancedFloorPlanProcessor } from '@/utils/advancedFloorPlanProcessor';
import { IntelligentIlotPlacer } from '@/utils/ilotPlacement';
import { IntelligentCorridorGenerator } from '@/utils/corridorGenerator';
import { FloorPlanCanvas } from './FloorPlanCanvas';
import { ConfigurationPanel } from './ConfigurationPanel';
import { toast } from 'sonner';

export const FloorPlanProcessor: React.FC = () => {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>({
    stage: 'parsing',
    progress: 0,
    message: 'Ready to process your floor plan'
  });
  const [config, setConfig] = useState<PlacementConfig>({
    layoutProfile: 25,
    corridorWidth: 1.2,
    minIlotSpacing: 1.0,
    maxIlotSize: 4.0,
    allowWallTouching: true,
    respectEntranceClearance: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<'empty' | 'placed' | 'corridors'>('empty');

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      // Only parse the floor plan - don't place îlots or corridors automatically
      const processor = new AdvancedFloorPlanProcessor((stage) => {
        setProcessingStage(stage);
      });
      
      // Process ONLY the basic floor plan parsing, not îlots/corridors
      const result = await processor.parseFloorPlanOnly(file);
      
      setFloorPlan(result.floorPlan);
      setCurrentStage('empty'); // Just show the empty floor plan
      
      toast.success(`Successfully parsed ${file.name} - ready for îlot placement`);
      
      setProcessingStage({
        stage: 'complete',
        progress: 100,
        message: `Floor plan ready - click "Place Îlots" to continue`
      });
      
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      setProcessingStage({
        stage: 'parsing',
        progress: 0,
        message: 'Error processing file'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [config]);

  const handlePlaceIlots = useCallback(async () => {
    if (!floorPlan) return;

    setIsProcessing(true);
    setProcessingStage({
      stage: 'placing',
      progress: 0,
      message: 'Placing îlots with intelligent algorithms...'
    });

    try {
      const ilotPlacer = new IntelligentIlotPlacer(floorPlan, config);
      
      setProcessingStage({
        stage: 'placing',
        progress: 50,
        message: 'Optimizing îlot placement...'
      });
      
      const placedIlots = ilotPlacer.placeIlots();
      
      setFloorPlan(prev => prev ? { ...prev, ilots: placedIlots } : null);
      setCurrentStage('placed');
      
      setProcessingStage({
        stage: 'complete',
        progress: 100,
        message: `Successfully placed ${placedIlots.length} îlots!`
      });
      
      toast.success(`Placed ${placedIlots.length} îlots with ${config.layoutProfile}% layout density`);
      
    } catch (error) {
      console.error('Error placing îlots:', error);
      toast.error('Failed to place îlots');
    } finally {
      setIsProcessing(false);
    }
  }, [floorPlan, config]);

  const handleGenerateCorridors = useCallback(async () => {
    if (!floorPlan || floorPlan.ilots.length === 0) return;

    setIsProcessing(true);
    setProcessingStage({
      stage: 'corridors',
      progress: 0,
      message: 'Generating corridor network...'
    });

    try {
      const corridorGenerator = new IntelligentCorridorGenerator(floorPlan, config.corridorWidth);
      
      setProcessingStage({
        stage: 'corridors',
        progress: 50,
        message: 'Optimizing corridor paths...'
      });
      
      const generatedCorridors = corridorGenerator.generateCorridors(floorPlan.ilots);
      
      setFloorPlan(prev => prev ? { ...prev, corridors: generatedCorridors } : null);
      setCurrentStage('corridors');
      
      setProcessingStage({
        stage: 'complete',
        progress: 100,
        message: `Generated ${generatedCorridors.length} corridors!`
      });
      
      toast.success(`Generated ${generatedCorridors.length} corridors with ${config.corridorWidth}m width`);
      
    } catch (error) {
      console.error('Error generating corridors:', error);
      toast.error('Failed to generate corridors');
    } finally {
      setIsProcessing(false);
    }
  }, [floorPlan, config]);

  const handleReset = () => {
    setFloorPlan(null);
    setCurrentStage('empty');
    setProcessingStage({
      stage: 'parsing',
      progress: 0,
      message: 'Ready to process your floor plan'
    });
    toast.info('Reset to start new floor plan');
  };

  const handleExport = () => {
    if (!floorPlan) return;
    
    // Generate export data
    const exportData = {
      floorPlan,
      timestamp: new Date().toISOString(),
      configuration: config,
      statistics: {
        totalArea: floorPlan.totalArea,
        availableArea: floorPlan.availableArea,
        ilotCount: floorPlan.ilots.length,
        corridorCount: floorPlan.corridors.length,
        utilizationRate: (floorPlan.ilots.reduce((sum, ilot) => sum + ilot.area, 0) / floorPlan.availableArea * 100).toFixed(1)
      }
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `floor-plan-${floorPlan.name}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Floor plan exported successfully');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Floor Plan Artisans
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional CAD processing, intelligent îlot placement, and automated corridor generation
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-6">
            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload CAD File
                </CardTitle>
                <CardDescription>
                  Support for DXF, DWG, and PDF architectural drawings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".dxf,.dwg,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs text-muted-foreground">
                        DXF, DWG, PDF up to 50MB
                      </span>
                    </label>
                  </div>
                  
                  {/* Progress */}
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{processingStage.message}</span>
                        <span>{processingStage.progress}%</span>
                      </div>
                      <Progress value={processingStage.progress} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            {floorPlan && (
              <ConfigurationPanel
                config={config}
                onChange={setConfig}
                disabled={isProcessing}
              />
            )}

            {/* Step-by-Step Workflow Controls */}
            {floorPlan && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Workflow Control
                  </CardTitle>
                  <CardDescription>
                    Process your floor plan step-by-step with full control
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Step 1: Place Îlots */}
                    <Button
                      onClick={handlePlaceIlots}
                      disabled={isProcessing || currentStage !== 'empty'}
                      className="w-full justify-start"
                      variant={currentStage === 'empty' ? 'default' : 'secondary'}
                    >
                      <Grid className="h-4 w-4 mr-2" />
                      {currentStage === 'empty' ? 'Place Îlots' : '✓ Îlots Placed'}
                    </Button>
                    
                    {/* Step 2: Generate Corridors */}
                    <Button
                      onClick={handleGenerateCorridors}
                      disabled={isProcessing || currentStage !== 'placed'}
                      className="w-full justify-start"
                      variant={currentStage === 'placed' ? 'default' : 'secondary'}
                    >
                      <Route className="h-4 w-4 mr-2" />
                      {currentStage === 'corridors' ? '✓ Corridors Generated' : 'Generate Corridors'}
                    </Button>
                    
                    <Separator />
                    
                    {/* Additional Actions */}
                    <Button
                      onClick={handleReset}
                      disabled={isProcessing}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    
                    <Button
                      onClick={handleExport}
                      disabled={!floorPlan || currentStage === 'empty'}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Status */}
            {floorPlan && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Processing Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={handlePlaceIlots}
                    disabled={isProcessing || currentStage !== 'empty'}
                    className="w-full"
                    variant={currentStage === 'empty' ? 'default' : 'secondary'}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    Place Îlots ({config.layoutProfile}%)
                  </Button>
                  
                  <Button
                    onClick={handleGenerateCorridors}
                    disabled={isProcessing || currentStage !== 'placed'}
                    className="w-full"
                    variant={currentStage === 'placed' ? 'default' : 'secondary'}
                  >
                    <Route className="h-4 w-4 mr-2" />
                    Generate Corridors ({config.corridorWidth}m)
                  </Button>
                  
                  <Separator />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleExport}
                      disabled={!floorPlan || currentStage === 'empty'}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            {floorPlan && (
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Area:</span>
                      <p className="font-semibold">{floorPlan.totalArea.toFixed(1)}m²</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available:</span>
                      <p className="font-semibold">{floorPlan.availableArea.toFixed(1)}m²</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Îlots:</span>
                      <p className="font-semibold">{floorPlan.ilots.length}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Corridors:</span>
                      <p className="font-semibold">{floorPlan.corridors.length}</p>
                    </div>
                  </div>
                  
                  {floorPlan.ilots.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Utilization:</span>
                      <p className="font-semibold text-primary">
                        {((floorPlan.ilots.reduce((sum, ilot) => sum + ilot.area, 0) / floorPlan.availableArea) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Center & Right - Canvas */}
          <div className="lg:col-span-2">
            <Card className="h-[800px]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    {floorPlan ? floorPlan.name : 'Floor Plan Visualization'}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={currentStage === 'empty' ? 'default' : 'secondary'}>
                      Empty Plan
                    </Badge>
                    <Badge variant={currentStage === 'placed' ? 'default' : 'secondary'}>
                      Îlots Placed
                    </Badge>
                    <Badge variant={currentStage === 'corridors' ? 'default' : 'secondary'}>
                      Corridors Generated
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-full p-0">
                {floorPlan ? (
                  <FloorPlanCanvas
                    floorPlan={floorPlan}
                    showIlots={currentStage !== 'empty'}
                    showCorridors={currentStage === 'corridors'}
                    showMeasurements={true}
                    stage={currentStage}
                    onElementClick={(id, type) => {
                      toast.info(`Clicked ${type}: ${id}`);
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Upload a CAD file to begin</p>
                      <p className="text-sm">Professional floor plan processing awaits</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};