export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  type: 'exterior' | 'interior' | 'load-bearing';
}

export interface Room {
  id: string;
  boundaries: Point[];
  area: number;
  type: 'available' | 'restricted' | 'entrance';
  name?: string;
}

export interface RestrictedArea {
  id: string;
  boundaries: Point[];
  type: 'stairs' | 'elevator' | 'utility' | 'mechanical';
  area: number;
}

export interface Entrance {
  id: string;
  position: Point;
  angle: number;
  width: number;
  type: 'main' | 'emergency' | 'service';
  swingDirection?: 'in' | 'out' | 'both';
}

export interface Ilot {
  id: string;
  position: Point;
  width: number;
  height: number;
  area: number;
  rotation: number;
  type: 'small' | 'medium' | 'large';
  isPlaced: boolean;
}

export interface Corridor {
  id: string;
  path: Point[];
  width: number;
  connectsIlots: string[];
  length: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  scale: number;
  unit: 'mm' | 'cm' | 'm' | 'ft' | 'in';
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  walls: Wall[];
  rooms: Room[];
  restrictedAreas: RestrictedArea[];
  entrances: Entrance[];
  ilots: Ilot[];
  corridors: Corridor[];
  totalArea: number;
  availableArea: number;
}

export interface PlacementConfig {
  layoutProfile: 10 | 25 | 30 | 35;
  corridorWidth: number;
  minIlotSpacing: number;
  maxIlotSize: number;
  allowWallTouching: boolean;
  respectEntranceClearance: boolean;
}

export interface ProcessingStage {
  stage: 'parsing' | 'analyzing' | 'transforming' | 'placing' | 'corridors' | 'complete';
  progress: number;
  message: string;
}

export interface AnalysisResult {
  floorPlan: FloorPlan;
  suggestions: {
    optimalLayout: PlacementConfig;
    estimatedCapacity: number;
    efficiencyScore: number;
    warnings: string[];
  };
}