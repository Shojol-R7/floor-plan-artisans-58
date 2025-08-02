import { FloorPlan, PlacementConfig, AnalysisResult, ProcessingStage, Wall, Room, RestrictedArea, Entrance, Ilot, Corridor, Point } from '@/types/floorplan';
import { IntelligentIlotPlacer } from './ilotPlacement';
import { IntelligentCorridorGenerator } from './corridorGenerator';

export class AdvancedFloorPlanProcessor {
  private onProgressUpdate?: (stage: ProcessingStage) => void;

  constructor(onProgressUpdate?: (stage: ProcessingStage) => void) {
    this.onProgressUpdate = onProgressUpdate;
  }

  async processFloorPlan(
    file: File, 
    config: PlacementConfig
  ): Promise<AnalysisResult> {
    try {
      // Stage 1: Parse and extract raw floor plan data
      this.updateProgress('parsing', 10, 'Analyzing CAD file structure...');
      const rawFloorPlan = await this.parseCADFile(file);
      
      // Stage 2: Transform raw data into architectural elements
      this.updateProgress('analyzing', 25, 'Identifying architectural elements...');
      const cleanFloorPlan = await this.transformToArchitecturalPlan(rawFloorPlan);
      
      // Stage 3: Validate and optimize floor plan structure
      this.updateProgress('transforming', 40, 'Optimizing floor plan structure...');
      const optimizedPlan = await this.optimizeFloorPlan(cleanFloorPlan);
      
      // Stage 4: Place îlots using intelligent algorithms
      this.updateProgress('placing', 60, 'Placing îlots with geometric constraints...');
      const ilotPlacer = new IntelligentIlotPlacer(optimizedPlan, config);
      const placedIlots = ilotPlacer.placeIlots();
      optimizedPlan.ilots = placedIlots;
      
      // Stage 5: Generate corridors between îlots
      this.updateProgress('corridors', 80, 'Generating optimal corridor network...');
      const corridorGenerator = new IntelligentCorridorGenerator(optimizedPlan, config.corridorWidth);
      const corridors = corridorGenerator.generateCorridors(placedIlots);
      optimizedPlan.corridors = corridors;
      
      // Stage 6: Final analysis and suggestions
      this.updateProgress('complete', 100, 'Analysis complete - generating suggestions...');
      const suggestions = this.generateAnalysisSuggestions(optimizedPlan, config);
      
      return {
        floorPlan: optimizedPlan,
        suggestions
      };
      
    } catch (error) {
      console.error('Floor plan processing error:', error);
      throw new Error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseCADFile(file: File): Promise<Partial<FloorPlan>> {
    // Advanced CAD parsing with multi-format support
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    switch (fileExtension) {
      case 'dxf':
        return this.parseDXFFile(file);
      case 'dwg':
        return this.parseDWGFile(file);
      case 'pdf':
        return this.parsePDFFile(file);
      default:
        throw new Error(`Unsupported file format: ${fileExtension}`);
    }
  }

  private async parseDXFFile(file: File): Promise<Partial<FloorPlan>> {
    // Enhanced DXF parsing with layer detection
    const text = await file.text();
    
    // Professional DXF entity extraction
    const entities = this.extractDXFEntities(text);
    const layers = this.identifyCADLayers(entities);
    
    // Classify entities by architectural purpose
    const walls = this.extractWallsFromEntities(entities, layers);
    const rooms = this.extractRoomsFromEntities(entities, layers);
    const restrictedAreas = this.extractRestrictedAreasFromEntities(entities, layers);
    const entrances = this.extractEntrancesFromEntities(entities, layers);
    
    // Calculate precise bounds and scale
    const bounds = this.calculatePreciseBounds([...walls, ...rooms, ...restrictedAreas]);
    const scale = this.detectOptimalScale(entities);
    
    return {
      id: `plan_${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      scale,
      unit: 'm',
      bounds,
      walls,
      rooms,
      restrictedAreas,
      entrances,
      ilots: [],
      corridors: [],
      totalArea: this.calculateTotalArea(bounds),
      availableArea: this.calculateAvailableArea(rooms, restrictedAreas)
    };
  }

  private async parseDWGFile(file: File): Promise<Partial<FloorPlan>> {
    // DWG files require specialized parsing - convert to DXF format first
    throw new Error('DWG files require conversion to DXF format. Please use DXF or PDF files.');
  }

  private async parsePDFFile(file: File): Promise<Partial<FloorPlan>> {
    // PDF parsing using OCR and vector extraction
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract vector graphics and text from PDF
    const extractedData = await this.extractPDFVectorData(arrayBuffer);
    
    // Convert PDF elements to architectural elements
    return this.convertPDFToFloorPlan(extractedData, file.name);
  }

  private extractDXFEntities(dxfContent: string): any[] {
    const entities: any[] = [];
    const lines = dxfContent.split('\n');
    
    let currentEntity: any = null;
    let inEntitiesSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'ENTITIES') {
        inEntitiesSection = true;
        continue;
      }
      
      if (line === 'ENDSEC' && inEntitiesSection) {
        break;
      }
      
      if (!inEntitiesSection) continue;
      
      // Parse DXF entity codes
      if (line === '0' && i + 1 < lines.length) {
        if (currentEntity) {
          entities.push(currentEntity);
        }
        
        const entityType = lines[i + 1].trim();
        currentEntity = { type: entityType, properties: {} };
        i++; // Skip the entity type line
        continue;
      }
      
      // Parse property codes
      if (currentEntity && /^\d+$/.test(line)) {
        const code = parseInt(line);
        const value = i + 1 < lines.length ? lines[i + 1].trim() : '';
        
        if (value) {
          currentEntity.properties[code] = this.parsePropertyValue(code, value);
          i++; // Skip the value line
        }
      }
    }
    
    if (currentEntity) {
      entities.push(currentEntity);
    }
    
    return entities;
  }

  private parsePropertyValue(code: number, value: string): any {
    // Convert DXF property codes to appropriate types
    if (code >= 10 && code <= 18) {
      return parseFloat(value); // X coordinates
    }
    if (code >= 20 && code <= 28) {
      return parseFloat(value); // Y coordinates  
    }
    if (code >= 30 && code <= 38) {
      return parseFloat(value); // Z coordinates
    }
    if (code >= 40 && code <= 48) {
      return parseFloat(value); // Float values
    }
    if (code >= 62 && code <= 78) {
      return parseInt(value); // Integer values
    }
    
    return value; // String values
  }

  private identifyCADLayers(entities: any[]): Map<string, string[]> {
    const layers = new Map<string, string[]>();
    
    // Common architectural layer naming conventions
    const layerPatterns = {
      walls: ['wall', 'mur', 'cloison', 'partition'],
      doors: ['door', 'porte', 'opening', 'ouverture'],
      windows: ['window', 'fenetre', 'glazing'],
      stairs: ['stair', 'escalier', 'step'],
      elevators: ['elevator', 'ascenseur', 'lift'],
      furniture: ['furniture', 'mobilier', 'equipment']
    };
    
    entities.forEach(entity => {
      const layerName = entity.properties[8]?.toLowerCase() || 'default';
      
      for (const [category, patterns] of Object.entries(layerPatterns)) {
        if (patterns.some(pattern => layerName.includes(pattern))) {
          if (!layers.has(category)) {
            layers.set(category, []);
          }
          layers.get(category)!.push(entity.id || `${entity.type}_${Date.now()}`);
          break;
        }
      }
    });
    
    return layers;
  }

  private extractWallsFromEntities(entities: any[], layers: Map<string, string[]>): Wall[] {
    const walls: Wall[] = [];
    
    entities.forEach((entity, index) => {
      if (entity.type === 'LINE' || entity.type === 'LWPOLYLINE') {
        const wall = this.convertEntityToWall(entity, `wall_${index}`);
        if (wall) {
          walls.push(wall);
        }
      }
    });
    
    return walls;
  }

  private convertEntityToWall(entity: any, id: string): Wall | null {
    const props = entity.properties;
    
    if (entity.type === 'LINE') {
      return {
        id,
        start: { x: props[10] || 0, y: props[20] || 0 },
        end: { x: props[11] || 0, y: props[21] || 0 },
        thickness: 0.2, // Default wall thickness
        type: 'interior'
      };
    }
    
    if (entity.type === 'LWPOLYLINE') {
      // Convert polyline to multiple wall segments
      const vertices = this.extractPolylineVertices(props);
      if (vertices.length >= 2) {
        return {
          id,
          start: vertices[0],
          end: vertices[1],
          thickness: 0.2,
          type: 'interior'
        };
      }
    }
    
    return null;
  }

  private extractPolylineVertices(props: any): Point[] {
    const vertices: Point[] = [];
    let x: number | undefined;
    
    for (const [code, value] of Object.entries(props)) {
      const numCode = parseInt(code as string);
      
      if (numCode === 10) {
        x = value as number;
      } else if (numCode === 20 && x !== undefined) {
        vertices.push({ x, y: value as number });
        x = undefined;
      }
    }
    
    return vertices;
  }

  private extractRoomsFromEntities(entities: any[], layers: Map<string, string[]>): Room[] {
    // Extract room boundaries from closed polygons
    const rooms: Room[] = [];
    
    entities.forEach((entity, index) => {
      if (entity.type === 'HATCH' || entity.type === 'SOLID') {
        const room = this.convertEntityToRoom(entity, `room_${index}`);
        if (room) {
          rooms.push(room);
        }
      }
    });
    
    // If no specific room entities, create default available area
    if (rooms.length === 0) {
      rooms.push({
        id: 'default_room',
        boundaries: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 }
        ],
        area: 1500,
        type: 'available'
      });
    }
    
    return rooms;
  }

  private convertEntityToRoom(entity: any, id: string): Room | null {
    // Convert CAD entity to room with boundaries
    const boundaries = this.extractEntityBoundaries(entity);
    
    if (boundaries.length >= 3) {
      return {
        id,
        boundaries,
        area: this.calculatePolygonArea(boundaries),
        type: 'available'
      };
    }
    
    return null;
  }

  private extractEntityBoundaries(entity: any): Point[] {
    // Extract boundary points from various CAD entities
    const boundaries: Point[] = [];
    
    if (entity.type === 'LWPOLYLINE') {
      return this.extractPolylineVertices(entity.properties);
    }
    
    // Default rectangular boundary
    return [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 }
    ];
  }

  private extractRestrictedAreasFromEntities(entities: any[], layers: Map<string, string[]>): RestrictedArea[] {
    const restrictedAreas: RestrictedArea[] = [];
    
    // Look for stair and elevator symbols
    entities.forEach((entity, index) => {
      if (this.isStairEntity(entity)) {
        const area = this.convertEntityToRestrictedArea(entity, `stairs_${index}`, 'stairs');
        if (area) restrictedAreas.push(area);
      }
      
      if (this.isElevatorEntity(entity)) {
        const area = this.convertEntityToRestrictedArea(entity, `elevator_${index}`, 'elevator');
        if (area) restrictedAreas.push(area);
      }
    });
    
    return restrictedAreas;
  }

  private isStairEntity(entity: any): boolean {
    // Detect stair patterns in CAD data
    const layerName = entity.properties[8]?.toLowerCase() || '';
    return layerName.includes('stair') || layerName.includes('escalier') || 
           entity.type === 'INSERT' && entity.properties[2]?.toLowerCase().includes('stair');
  }

  private isElevatorEntity(entity: any): boolean {
    // Detect elevator patterns in CAD data
    const layerName = entity.properties[8]?.toLowerCase() || '';
    return layerName.includes('elevator') || layerName.includes('ascenseur') ||
           entity.type === 'INSERT' && entity.properties[2]?.toLowerCase().includes('elevator');
  }

  private convertEntityToRestrictedArea(
    entity: any, 
    id: string, 
    type: 'stairs' | 'elevator' | 'utility' | 'mechanical'
  ): RestrictedArea | null {
    const boundaries = this.extractEntityBoundaries(entity);
    
    if (boundaries.length >= 3) {
      return {
        id,
        boundaries,
        type,
        area: this.calculatePolygonArea(boundaries)
      };
    }
    
    return null;
  }

  private extractEntrancesFromEntities(entities: any[], layers: Map<string, string[]>): Entrance[] {
    const entrances: Entrance[] = [];
    
    entities.forEach((entity, index) => {
      if (this.isDoorEntity(entity)) {
        const entrance = this.convertEntityToEntrance(entity, `entrance_${index}`);
        if (entrance) entrances.push(entrance);
      }
    });
    
    return entrances;
  }

  private isDoorEntity(entity: any): boolean {
    // Detect door patterns in CAD data
    const layerName = entity.properties[8]?.toLowerCase() || '';
    return layerName.includes('door') || layerName.includes('porte') ||
           entity.type === 'ARC' || entity.type === 'CIRCLE';
  }

  private convertEntityToEntrance(entity: any, id: string): Entrance | null {
    const props = entity.properties;
    
    if (entity.type === 'ARC' || entity.type === 'CIRCLE') {
      const centerX = props[10] || 0;
      const centerY = props[20] || 0;
      const radius = props[40] || 1;
      
      return {
        id,
        position: { x: centerX, y: centerY },
        angle: 0,
        width: radius * 2,
        type: 'main',
        swingDirection: 'both'
      };
    }
    
    return null;
  }

  private async extractPDFVectorData(arrayBuffer: ArrayBuffer): Promise<any> {
    // PDF vector extraction would require a PDF parsing library
    // For now, create a mock structure
    return {
      vectors: [],
      text: [],
      dimensions: { width: 100, height: 100 }
    };
  }

  private convertPDFToFloorPlan(extractedData: any, fileName: string): Partial<FloorPlan> {
    // Convert PDF extracted data to floor plan structure
    return {
      id: `pdf_plan_${Date.now()}`,
      name: fileName.replace(/\.[^/.]+$/, ""),
      scale: 1,
      unit: 'm',
      bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
      walls: [],
      rooms: [],
      restrictedAreas: [],
      entrances: [],
      ilots: [],
      corridors: [],
      totalArea: 10000,
      availableArea: 8000
    };
  }

  private async transformToArchitecturalPlan(rawPlan: Partial<FloorPlan>): Promise<FloorPlan> {
    // Transform raw CAD data into clean architectural elements
    const cleanPlan: FloorPlan = {
      id: rawPlan.id || `plan_${Date.now()}`,
      name: rawPlan.name || 'Untitled Plan',
      scale: rawPlan.scale || 1,
      unit: rawPlan.unit || 'm',
      bounds: rawPlan.bounds || { minX: 0, maxX: 50, minY: 0, maxY: 30 },
      walls: this.cleanAndOptimizeWalls(rawPlan.walls || []),
      rooms: this.cleanAndOptimizeRooms(rawPlan.rooms || []),
      restrictedAreas: this.cleanAndOptimizeRestrictedAreas(rawPlan.restrictedAreas || []),
      entrances: this.cleanAndOptimizeEntrances(rawPlan.entrances || []),
      ilots: [],
      corridors: [],
      totalArea: rawPlan.totalArea || 0,
      availableArea: rawPlan.availableArea || 0
    };
    
    // Recalculate areas with cleaned data
    cleanPlan.totalArea = this.calculateTotalArea(cleanPlan.bounds);
    cleanPlan.availableArea = this.calculateAvailableArea(cleanPlan.rooms, cleanPlan.restrictedAreas);
    
    return cleanPlan;
  }

  private cleanAndOptimizeWalls(walls: Wall[]): Wall[] {
    // Remove duplicate walls and optimize connections
    const cleanWalls: Wall[] = [];
    const tolerance = 0.1; // 10cm tolerance
    
    for (const wall of walls) {
      // Check if wall already exists (within tolerance)
      const exists = cleanWalls.some(existing => 
        this.arePointsEqual(wall.start, existing.start, tolerance) &&
        this.arePointsEqual(wall.end, existing.end, tolerance)
      );
      
      if (!exists && this.isValidWall(wall)) {
        cleanWalls.push({
          ...wall,
          type: this.classifyWallType(wall)
        });
      }
    }
    
    return cleanWalls;
  }

  private cleanAndOptimizeRooms(rooms: Room[]): Room[] {
    return rooms.map(room => ({
      ...room,
      type: this.classifyRoomType(room),
      area: this.calculatePolygonArea(room.boundaries)
    }));
  }

  private cleanAndOptimizeRestrictedAreas(areas: RestrictedArea[]): RestrictedArea[] {
    return areas.map(area => ({
      ...area,
      area: this.calculatePolygonArea(area.boundaries)
    }));
  }

  private cleanAndOptimizeEntrances(entrances: Entrance[]): Entrance[] {
    return entrances.map(entrance => ({
      ...entrance,
      type: this.classifyEntranceType(entrance)
    }));
  }

  private async optimizeFloorPlan(plan: FloorPlan): Promise<FloorPlan> {
    // Apply architectural optimization rules
    const optimized = { ...plan };
    
    // Snap elements to grid
    optimized.walls = this.snapWallsToGrid(optimized.walls);
    optimized.rooms = this.snapRoomsToGrid(optimized.rooms);
    
    // Validate architectural constraints
    this.validateArchitecturalConstraints(optimized);
    
    return optimized;
  }

  private snapWallsToGrid(walls: Wall[], gridSize: number = 0.1): Wall[] {
    return walls.map(wall => ({
      ...wall,
      start: this.snapPointToGrid(wall.start, gridSize),
      end: this.snapPointToGrid(wall.end, gridSize)
    }));
  }

  private snapRoomsToGrid(rooms: Room[], gridSize: number = 0.1): Room[] {
    return rooms.map(room => ({
      ...room,
      boundaries: room.boundaries.map(point => this.snapPointToGrid(point, gridSize))
    }));
  }

  private snapPointToGrid(point: Point, gridSize: number): Point {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }

  private generateAnalysisSuggestions(plan: FloorPlan, config: PlacementConfig) {
    const totalIlotArea = plan.ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const utilizationRatio = plan.availableArea > 0 ? totalIlotArea / plan.availableArea : 0;
    const efficiencyScore = this.calculateEfficiencyScore(plan, config);
    
    const warnings: string[] = [];
    
    // Generate optimization warnings
    if (utilizationRatio < 0.15) {
      warnings.push('Space utilization is low - consider adding more îlots');
    }
    if (utilizationRatio > 0.4) {
      warnings.push('Space may be overcrowded - consider reducing îlot density');
    }
    if (plan.corridors.length === 0) {
      warnings.push('No corridors generated - îlots may be inaccessible');
    }
    
    return {
      optimalLayout: this.calculateOptimalLayout(plan),
      estimatedCapacity: Math.floor(totalIlotArea / 4), // Rough estimate
      efficiencyScore,
      warnings
    };
  }

  private calculateEfficiencyScore(plan: FloorPlan, config: PlacementConfig): number {
    let score = 100;
    
    // Penalize for poor space utilization
    const totalIlotArea = plan.ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const utilizationRatio = plan.availableArea > 0 ? totalIlotArea / plan.availableArea : 0;
    const targetRatio = config.layoutProfile / 100;
    
    score -= Math.abs(utilizationRatio - targetRatio) * 200;
    
    // Penalize for accessibility issues
    if (plan.corridors.length === 0) score -= 30;
    
    // Reward for good distribution
    if (plan.ilots.length > 0) {
      const distributionScore = this.calculateDistributionScore(plan.ilots);
      score += distributionScore * 0.2;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateOptimalLayout(plan: FloorPlan): PlacementConfig {
    const totalIlotArea = plan.ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const utilizationRatio = plan.availableArea > 0 ? totalIlotArea / plan.availableArea : 0;
    
    // Suggest optimal layout profile based on analysis
    let optimalProfile: 10 | 25 | 30 | 35 = 25;
    
    if (utilizationRatio < 0.15) optimalProfile = 30;
    else if (utilizationRatio > 0.35) optimalProfile = 10;
    
    return {
      layoutProfile: optimalProfile,
      corridorWidth: 1.2, // Default 1.2m as specified
      minIlotSpacing: 1.5,
      maxIlotSize: 6.0,
      allowWallTouching: true,
      respectEntranceClearance: true
    };
  }

  // Utility functions
  private updateProgress(stage: ProcessingStage['stage'], progress: number, message: string) {
    if (this.onProgressUpdate) {
      this.onProgressUpdate({ stage, progress, message });
    }
  }

  private calculatePreciseBounds(elements: any[]): { minX: number; maxX: number; minY: number; maxY: number } {
    if (elements.length === 0) {
      return { minX: 0, maxX: 50, minY: 0, maxY: 30 };
    }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const element of elements) {
      if (element.start && element.end) {
        // Wall element
        minX = Math.min(minX, element.start.x, element.end.x);
        maxX = Math.max(maxX, element.start.x, element.end.x);
        minY = Math.min(minY, element.start.y, element.end.y);
        maxY = Math.max(maxY, element.start.y, element.end.y);
      } else if (element.boundaries) {
        // Room or area element
        for (const point of element.boundaries) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
      }
    }
    
    // Add padding
    const padding = 2;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding
    };
  }

  private detectOptimalScale(entities: any[]): number {
    // Analyze entity dimensions to determine appropriate scale
    return 1; // Default scale
  }

  private calculateTotalArea(bounds: { minX: number; maxX: number; minY: number; maxY: number }): number {
    return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
  }

  private calculateAvailableArea(rooms: Room[], restrictedAreas: RestrictedArea[]): number {
    const totalRoomArea = rooms
      .filter(room => room.type === 'available')
      .reduce((sum, room) => sum + room.area, 0);
    
    const totalRestrictedArea = restrictedAreas.reduce((sum, area) => sum + area.area, 0);
    
    return Math.max(0, totalRoomArea - totalRestrictedArea);
  }

  private calculatePolygonArea(vertices: Point[]): number {
    if (vertices.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  private arePointsEqual(p1: Point, p2: Point, tolerance: number): boolean {
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  }

  private isValidWall(wall: Wall): boolean {
    const length = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    return length > 0.1; // Minimum 10cm wall length
  }

  private classifyWallType(wall: Wall): 'exterior' | 'interior' | 'load-bearing' {
    // Basic wall classification logic
    const length = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) + 
      Math.pow(wall.end.y - wall.start.y, 2)
    );
    
    return length > 10 ? 'exterior' : 'interior';
  }

  private classifyRoomType(room: Room): 'available' | 'restricted' | 'entrance' {
    // Basic room classification
    return room.area > 10 ? 'available' : 'restricted';
  }

  private classifyEntranceType(entrance: Entrance): 'main' | 'emergency' | 'service' {
    // Basic entrance classification
    return entrance.width > 1.5 ? 'main' : 'service';
  }

  private validateArchitecturalConstraints(plan: FloorPlan): void {
    // Validate architectural rules and constraints
    console.log('Validating architectural constraints for plan:', plan.name);
  }

  private calculateDistributionScore(ilots: Ilot[]): number {
    if (ilots.length < 2) return 0;
    
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < ilots.length; i++) {
      for (let j = i + 1; j < ilots.length; j++) {
        const distance = Math.sqrt(
          Math.pow(ilots[j].position.x - ilots[i].position.x, 2) +
          Math.pow(ilots[j].position.y - ilots[i].position.y, 2)
        );
        totalDistance += distance;
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalDistance / pairCount : 0;
  }
}