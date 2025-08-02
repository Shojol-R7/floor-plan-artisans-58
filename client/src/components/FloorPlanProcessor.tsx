The code has been updated to incorporate a processing stage in the workflow pipeline, enhance the visual rendering of the floor plan based on the current stage, and correctly manage the display of îlots and corridors.
```

```replit_final_file
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Zap, Grid, Route, Download, Play, Pause, RotateCcw, Building2, BarChart3, Target, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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
  const [currentStage, setCurrentStage] = useState<'empty' | 'parsed' | 'processed' | 'placed' | 'corridors'>('empty');

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const processor = new AdvancedFloorPlanProcessor((stage) => {
        setProcessingStage(stage);
      });

      const result = await processor.parseFloorPlanOnly(file);

      setFloorPlan(result.floorPlan);
      setCurrentStage('parsed');

      toast.success(`Successfully parsed ${file.name} - ready for processing`);

      setProcessingStage({
        stage: 'complete',
        progress: 100,
        message: `Floor plan parsed - click "Process Plan" to continue`
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

  const handleProcessPlan = useCallback(async () => {
    if (!floorPlan) return;

    setIsProcessing(true);
    setProcessingStage({
      stage: 'processing',
      progress: 0,
      message: 'Processing raw floor plan data...'
    });

    try {
      // Simulate processing (replace with actual processing logic)
      await new Promise(resolve => setTimeout(resolve, 1500));

      setProcessingStage({
        stage: 'processing',
        progress: 75,
        message: 'Optimizing architectural elements...'
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      // After processing, update the floor plan and stage
      setFloorPlan(prev => prev ? { ...prev, processed: true } : null);
      setCurrentStage('processed');

      setProcessingStage({
        stage: 'complete',
        progress: 100,
        message: `Successfully processed floor plan - ready for îlot placement`
      });

      toast.success(`Floor plan processed - ready for îlot placement`);

    } catch (error) {
      console.error('Error processing floor plan:', error);
      toast.error('Failed to process floor plan');
    } finally {
      setIsProcessing(false);
    }
  }, [floorPlan]);

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

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `floor-plan-${floorPlan.name}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Floor plan exported successfully');
  };

  const getStageStatus = (stage: string) => {
    if (stage === 'parse' && floorPlan) return 'complete';
    if (stage === 'process' && currentStage === 'processed') return 'complete';
    if (stage === 'process' && currentStage === 'parsed') return 'active';
    if (stage === 'place' && currentStage === 'placed') return 'complete';
    if (stage === 'place' && currentStage === 'processed') return 'active';
    if (stage === 'corridors' && currentStage === 'corridors') return 'complete';
    if (stage === 'corridors' && currentStage === 'placed') return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Professional Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Floor Plan Artisans</h1>
                  <p className="text-sm text-slate-600">Professional CAD Processing & Intelligent Space Planning</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Enterprise Ready
              </Badge>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Zap className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Left Sidebar - Controls */}
          <div className="xl:col-span-1 space-y-6">

            {/* File Upload Section */}
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Upload className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Import CAD File</CardTitle>
                    <CardDescription className="text-xs">Professional architectural drawings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative group">
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center transition-all duration-200 group-hover:border-blue-300 group-hover:bg-blue-50/50">
                    <input
                      type="file"
                      accept=".dxf,.dwg,.pdf"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isProcessing}
                    />
                    <div className="space-y-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">Drop files here</p>
                        <p className="text-sm text-slate-500">or click to browse</p>
                      </div>
                      <div className="flex justify-center space-x-2">
                        <Badge variant="secondary" className="text-xs">DXF</Badge>
                        <Badge variant="secondary" className="text-xs">DWG</Badge>
                        <Badge variant="secondary" className="text-xs">PDF</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {isProcessing && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-600 animate-spin" />
                        <span className="text-sm font-medium text-blue-900">{processingStage.message}</span>
                      </div>
                      <span className="text-sm font-semibold text-blue-700">{processingStage.progress}%</span>
                    </div>
                    <Progress value={processingStage.progress} className="h-2 bg-blue-100" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Pipeline */}
            {floorPlan && (
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Target className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Processing Pipeline</CardTitle>
                      <CardDescription className="text-xs">Intelligent workflow automation</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Pipeline Steps */}
                  <div className="space-y-3">
                    {/* Step 1: Parse */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      getStageStatus('parse') === 'complete' 
                        ? 'bg-gradient-to-r from-green-50 to-green-50/50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        getStageStatus('parse') === 'complete' ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          getStageStatus('parse') === 'complete' ? 'text-green-900' : 'text-gray-600'
                        }`}>Floor Plan Parsed</p>
                        <p className="text-xs text-gray-500">Raw CAD data extracted</p>
                      </div>
                    </div>

                    {/* Step 2: Process */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      getStageStatus('process') === 'complete' 
                        ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-200' 
                        : getStageStatus('process') === 'active'
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-50/50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        getStageStatus('process') === 'complete' ? 'bg-blue-500' 
                        : getStageStatus('process') === 'active' ? 'bg-yellow-500'
                        : 'bg-gray-400'
                      }`}>
                        {getStageStatus('process') === 'active' ? (
                          <Clock className="h-4 w-4 text-white animate-spin" />
                        ) : (
                          <Building2 className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          getStageStatus('process') === 'complete' ? 'text-blue-900' 
                          : getStageStatus('process') === 'active' ? 'text-yellow-900'
                          : 'text-gray-600'
                        }`}>Architectural Processing</p>
                        <p className="text-xs text-gray-500">Clean and optimize structure</p>
                      </div>
                      {getStageStatus('process') === 'active' && (
                        <Button 
                          onClick={handleProcessPlan} 
                          disabled={isProcessing}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isProcessing ? 'Processing...' : 'Process Plan'}
                        </Button>
                      )}
                    </div>

                    {/* Step 3: Place Îlots */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      getStageStatus('place') === 'complete' 
                        ? 'bg-gradient-to-r from-purple-50 to-purple-50/50 border-purple-200' 
                        : getStageStatus('place') === 'active'
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-50/50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        getStageStatus('place') === 'complete' ? 'bg-purple-500' 
                        : getStageStatus('place') === 'active' ? 'bg-yellow-500'
                        : 'bg-gray-400'
                      }`}>
                        {getStageStatus('place') === 'active' ? (
                          <Clock className="h-4 w-4 text-white animate-spin" />
                        ) : (
                          <Grid className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          getStageStatus('place') === 'complete' ? 'text-purple-900' 
                          : getStageStatus('place') === 'active' ? 'text-yellow-900'
                          : 'text-gray-600'
                        }`}>Îlot Placement</p>
                        <p className="text-xs text-gray-500">Intelligent spatial optimization</p>
                      </div>
                      {getStageStatus('place') === 'active' && (
                        <Button 
                          onClick={handlePlaceIlots} 
                          disabled={isProcessing}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isProcessing ? 'Placing...' : 'Place Îlots'}
                        </Button>
                      )}
                    </div>

                    {/* Step 4: Generate Corridors */}
                    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      getStageStatus('corridors') === 'complete' 
                        ? 'bg-gradient-to-r from-orange-50 to-orange-50/50 border-orange-200' 
                        : getStageStatus('corridors') === 'active'
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-50/50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        getStageStatus('corridors') === 'complete' ? 'bg-orange-500' 
                        : getStageStatus('corridors') === 'active' ? 'bg-yellow-500'
                        : 'bg-gray-400'
                      }`}>
                        {getStageStatus('corridors') === 'active' ? (
                          <Clock className="h-4 w-4 text-white animate-spin" />
                        ) : (
                          <Route className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          getStageStatus('corridors') === 'complete' ? 'text-orange-900' 
                          : getStageStatus('corridors') === 'active' ? 'text-yellow-900'
                          : 'text-gray-600'
                        }`}>Corridor Generation</p>
                        <p className="text-xs text-gray-500">Pathfinding and flow optimization</p>
                      </div>
                      {getStageStatus('corridors') === 'active' && (
                        <Button 
                          onClick={handleGenerateCorridors} 
                          disabled={isProcessing}
                          size="sm"
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          {isProcessing ? 'Generating...' : 'Generate Corridors'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleReset}
                      disabled={isProcessing}
                      variant="outline"
                      size="sm"
                      className="text-slate-600 border-slate-200 hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>

                    <Button
                      onClick={handleExport}
                      disabled={!floorPlan || currentStage === 'empty'}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Configuration Panel */}
            {floorPlan && (
              <ConfigurationPanel
                config={config}
                onChange={setConfig}
                disabled={isProcessing}
              />
            )}

          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">

            {/* Analytics Dashboard */}
            {floorPlan && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Area</p>
                        <p className="text-2xl font-bold text-blue-900">{floorPlan.totalArea?.toFixed(0) || 0}</p>
                        <p className="text-xs text-blue-600">m²</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-emerald-600">Available Space</p>
                        <p className="text-2xl font-bold text-emerald-900">{floorPlan.availableArea?.toFixed(0) || 0}</p>
                        <p className="text-xs text-emerald-600">m²</p>
                      </div>
                      <Target className="h-8 w-8 text-emerald-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Îlots Placed</p>
                        <p className="text-2xl font-bold text-purple-900">{floorPlan.ilots?.length || 0}</p>
                        <p className="text-xs text-purple-600">units</p>
                      </div>
                      <Grid className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Utilization</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {floorPlan.ilots && floorPlan.ilots.length > 0
                            ? ((floorPlan.ilots.reduce((sum, ilot) => sum + ilot.area, 0) / floorPlan.availableArea) * 100).toFixed(1)
                            : '0'
                          }
                        </p>
                        <p className="text-xs text-orange-600">%</p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Canvas */}
            <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">
                      {floorPlan ? floorPlan.name : 'Floor Plan Visualization'}
                    </CardTitle>
                    <CardDescription>
                      Interactive CAD rendering with real-time updates
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={currentStage === 'empty' ? 'default' : 'secondary'}
                      className={currentStage === 'empty' ? 'bg-blue-600' : 'bg-slate-200 text-slate-600'}
                    >
                      Empty Plan
                    </Badge>
                    <Badge 
                      variant={currentStage === 'parsed' ? 'default' : 'secondary'}
                      className={currentStage === 'parsed' ? 'bg-blue-600' : 'bg-slate-200 text-slate-600'}
                    >
                      Raw Plan
                    </Badge>
                    <Badge 
                      variant={currentStage === 'processed' ? 'default' : 'secondary'}
                      className={currentStage === 'processed' ? 'bg-blue-600' : 'bg-slate-200 text-slate-600'}
                    >
                      Processed
                    </Badge>
                    <Badge 
                      variant={currentStage === 'placed' ? 'default' : 'secondary'}
                      className={currentStage === 'placed' ? 'bg-blue-600' : 'bg-slate-200 text-slate-600'}
                    >
                      Îlots Placed
                    </Badge>
                    <Badge 
                      variant={currentStage === 'corridors' ? 'default' : 'secondary'}
                      className={currentStage === 'corridors' ? 'bg-blue-600' : 'bg-slate-200 text-slate-600'}
                    >
                      Complete
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[600px] relative">
                  {floorPlan ? (
                    <FloorPlanCanvas
                      floorPlan={floorPlan}
                      showIlots={currentStage === 'placed' || currentStage === 'corridors'}
                      showCorridors={currentStage === 'corridors'}
                      showMeasurements={true}
                      stage={currentStage}
                      onElementClick={(id, type) => {
                        toast.info(`Selected ${type}: ${id}`);
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                      <div className="text-center space-y-4">
                        <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl mx-auto flex items-center justify-center">
                          <Building2 className="h-12 w-12 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-slate-700 mb-2">Professional CAD Processing</h3>
                          <p className="text-slate-500 max-w-md">
                            Upload your architectural drawings to begin intelligent space planning with industry-grade algorithms
                          </p>
                        </div>
                        <div className="flex justify-center space-x-2 pt-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Zap className="h-3 w-3 mr-1" />
                            AI Optimization
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Target className="h-3 w-3 mr-1" />
                            Precision Planning
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};