
import { FloorPlan, Ilot, Point, PlacementConfig, Room, RestrictedArea, Entrance } from '@/types/floorplan';

export class IntelligentIlotPlacer {
  private config: PlacementConfig;
  private floorPlan: FloorPlan;
  private placementGrid: number[][];
  private gridResolution: number = 0.2; // 20cm resolution for precision
  private maxIterations: number = 5000;

  constructor(floorPlan: FloorPlan, config: PlacementConfig) {
    this.floorPlan = floorPlan;
    this.config = config;
    this.initializeGrid();
  }

  placeIlots(): Ilot[] {
    console.log('Starting advanced îlot placement with target utilization:', this.config.layoutProfile + '%');
    
    // Multi-stage placement algorithm
    const stage1Ilots = this.primaryPlacementStage();
    const stage2Ilots = this.optimizationStage(stage1Ilots);
    const finalIlots = this.densificationStage(stage2Ilots);
    
    const utilization = this.calculateUtilization(finalIlots);
    console.log(`Achieved ${utilization.toFixed(1)}% space utilization with ${finalIlots.length} îlots`);
    
    return finalIlots;
  }

  private initializeGrid(): void {
    const bounds = this.floorPlan.bounds;
    const width = Math.ceil((bounds.maxX - bounds.minX) / this.gridResolution);
    const height = Math.ceil((bounds.maxY - bounds.minY) / this.gridResolution);
    
    this.placementGrid = Array(height).fill(0).map(() => Array(width).fill(0));
    
    // Mark restricted areas
    this.markRestrictedAreas();
    this.markWallBuffers();
    this.markEntranceBuffers();
  }

  private markRestrictedAreas(): void {
    for (const area of this.floorPlan.restrictedAreas) {
      this.markPolygonOnGrid(area.boundaries, -1); // -1 = restricted
    }
  }

  private markWallBuffers(): void {
    for (const wall of this.floorPlan.walls) {
      this.markWallBufferOnGrid(wall, 0.3); // 30cm buffer from walls
    }
  }

  private markEntranceBuffers(): void {
    for (const entrance of this.floorPlan.entrances) {
      this.markCircleOnGrid(entrance.position, 2.5, -1); // 2.5m clearance around entrances
    }
  }

  private primaryPlacementStage(): Ilot[] {
    const placedIlots: Ilot[] = [];
    const availableZones = this.identifyOptimalZones();
    
    // Start with largest îlots for maximum space efficiency
    const ilotSizes = this.generateDynamicIlotSizes();
    
    for (const zone of availableZones) {
      const zoneIlots = this.placeIlotsInZoneAdvanced(zone, ilotSizes);
      placedIlots.push(...zoneIlots);
      
      // Update grid occupancy
      this.markIlotsOnGrid(zoneIlots);
    }
    
    return placedIlots;
  }

  private optimizationStage(ilots: Ilot[]): Ilot[] {
    console.log('Starting optimization stage with genetic algorithm...');
    
    let bestLayout = [...ilots];
    let bestScore = this.evaluateLayoutAdvanced(bestLayout);
    
    // Genetic algorithm optimization
    for (let generation = 0; generation < 100; generation++) {
      const candidates = this.generateLayoutCandidates(bestLayout, 20);
      
      for (const candidate of candidates) {
        const score = this.evaluateLayoutAdvanced(candidate);
        if (score > bestScore) {
          bestScore = score;
          bestLayout = candidate;
        }
      }
      
      if (generation % 20 === 0) {
        console.log(`Generation ${generation}: Best score ${bestScore.toFixed(2)}`);
      }
    }
    
    return bestLayout;
  }

  private densificationStage(ilots: Ilot[]): Ilot[] {
    console.log('Starting densification stage for maximum utilization...');
    
    const densifiedIlots = [...ilots];
    this.clearGridOccupancy();
    this.markIlotsOnGrid(densifiedIlots);
    
    // Fill remaining spaces with smaller îlots
    const fillIlots = this.fillRemainingSpaces();
    densifiedIlots.push(...fillIlots);
    
    // Final micro-optimizations
    return this.performMicroOptimizations(densifiedIlots);
  }

  private identifyOptimalZones(): Room[] {
    return this.floorPlan.rooms
      .filter(room => room.type === 'available')
      .sort((a, b) => {
        // Prioritize zones by potential efficiency
        const aEfficiency = this.calculateZoneEfficiency(a);
        const bEfficiency = this.calculateZoneEfficiency(b);
        return bEfficiency - aEfficiency;
      });
  }

  private calculateZoneEfficiency(zone: Room): number {
    const bounds = this.calculateZoneBounds(zone.boundaries);
    const aspectRatio = Math.max(bounds.width, bounds.height) / Math.min(bounds.width, bounds.height);
    const compactness = zone.area / (bounds.width * bounds.height);
    
    // Prefer rectangular zones with good compactness
    return compactness / Math.max(1, aspectRatio - 1);
  }

  private generateDynamicIlotSizes(): Array<{ size: number; weight: number; type: string }> {
    const targetUtilization = this.config.layoutProfile / 100;
    
    return [
      { size: 6.0, weight: targetUtilization > 0.3 ? 0.4 : 0.2, type: 'large' },
      { size: 4.5, weight: 0.35, type: 'medium-large' },
      { size: 3.0, weight: 0.25, type: 'medium' },
      { size: 2.0, weight: targetUtilization > 0.25 ? 0.15 : 0.3, type: 'small-medium' },
      { size: 1.5, weight: 0.1, type: 'small' },
      { size: 1.0, weight: 0.05, type: 'micro' }
    ];
  }

  private placeIlotsInZoneAdvanced(zone: Room, ilotSizes: any[]): Ilot[] {
    const placedIlots: Ilot[] = [];
    const bounds = this.calculateZoneBounds(zone.boundaries);
    
    // Adaptive grid spacing based on target utilization
    const baseSpacing = this.config.layoutProfile > 30 ? 1.0 : 1.5;
    const adaptiveSpacing = Math.max(0.5, baseSpacing - (this.config.layoutProfile / 100));
    
    // Multi-pass placement with different strategies
    this.hexagonalGridPlacement(zone, ilotSizes, placedIlots, adaptiveSpacing);
    this.triangularFillPlacement(zone, ilotSizes, placedIlots);
    this.opportunisticPlacement(zone, ilotSizes, placedIlots);
    
    return placedIlots;
  }

  private hexagonalGridPlacement(zone: Room, ilotSizes: any[], placedIlots: Ilot[], spacing: number): void {
    const bounds = this.calculateZoneBounds(zone.boundaries);
    const hexSpacing = spacing * 0.866; // Hexagonal efficiency factor
    
    let row = 0;
    for (let y = bounds.minY + 1; y < bounds.maxY - 1; y += hexSpacing) {
      const offsetX = (row % 2) * (spacing / 2); // Hexagonal offset
      
      for (let x = bounds.minX + 1 + offsetX; x < bounds.maxX - 1; x += spacing) {
        const position = { x, y };
        
        if (!this.isPositionInZone(position, zone)) continue;
        if (!this.isGridPositionAvailable(position)) continue;
        
        const ilotConfig = this.selectOptimalIlotForPosition(position, zone, ilotSizes);
        if (!ilotConfig) continue;
        
        if (this.canPlaceIlotAt(position, ilotConfig.size, placedIlots)) {
          const ilot = this.createIlot(position, ilotConfig);
          placedIlots.push(ilot);
          this.markIlotOnGrid(ilot);
        }
      }
      row++;
    }
  }

  private triangularFillPlacement(zone: Room, ilotSizes: any[], placedIlots: Ilot[]): void {
    // Fill triangular gaps between placed îlots
    const smallSizes = ilotSizes.filter(s => s.size <= 2.0);
    
    for (let attempt = 0; attempt < 200; attempt++) {
      const position = this.findTriangularGap(zone);
      if (!position) continue;
      
      const suitableSize = smallSizes.find(size => 
        this.canPlaceIlotAt(position, size.size, placedIlots)
      );
      
      if (suitableSize) {
        const ilot = this.createIlot(position, suitableSize);
        placedIlots.push(ilot);
        this.markIlotOnGrid(ilot);
      }
    }
  }

  private opportunisticPlacement(zone: Room, ilotSizes: any[], placedIlots: Ilot[]): void {
    // Random sampling for remaining opportunities
    const samples = 500;
    const bounds = this.calculateZoneBounds(zone.boundaries);
    
    for (let i = 0; i < samples; i++) {
      const position = {
        x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY)
      };
      
      if (!this.isPositionInZone(position, zone)) continue;
      if (!this.isGridPositionAvailable(position)) continue;
      
      const suitableSize = ilotSizes.find(size => 
        this.canPlaceIlotAt(position, size.size, placedIlots)
      );
      
      if (suitableSize && Math.random() < suitableSize.weight) {
        const ilot = this.createIlot(position, suitableSize);
        placedIlots.push(ilot);
        this.markIlotOnGrid(ilot);
      }
    }
  }

  private fillRemainingSpaces(): Ilot[] {
    const fillIlots: Ilot[] = [];
    const microSizes = [1.0, 0.8, 0.6, 0.4];
    
    // Scan grid for small available spaces
    const bounds = this.floorPlan.bounds;
    const step = this.gridResolution * 2;
    
    for (let x = bounds.minX; x < bounds.maxX; x += step) {
      for (let y = bounds.minY; y < bounds.maxY; y += step) {
        const position = { x, y };
        
        if (!this.isGridPositionAvailable(position)) continue;
        
        for (const size of microSizes) {
          if (this.canPlaceIlotAt(position, size, fillIlots)) {
            const ilot = this.createIlot(position, { size, type: 'fill', weight: 1 });
            fillIlots.push(ilot);
            this.markIlotOnGrid(ilot);
            break;
          }
        }
      }
    }
    
    return fillIlots;
  }

  private generateLayoutCandidates(baseLayout: Ilot[], count: number): Ilot[][] {
    const candidates: Ilot[][] = [];
    
    for (let i = 0; i < count; i++) {
      const candidate = this.mutateLayout([...baseLayout]);
      candidates.push(candidate);
    }
    
    return candidates;
  }

  private mutateLayout(layout: Ilot[]): Ilot[] {
    const mutated = [...layout];
    const mutationCount = Math.max(1, Math.floor(layout.length * 0.1));
    
    for (let i = 0; i < mutationCount; i++) {
      const index = Math.floor(Math.random() * mutated.length);
      const ilot = mutated[index];
      
      // Small position adjustment
      const newPosition = {
        x: ilot.position.x + (Math.random() - 0.5) * 2,
        y: ilot.position.y + (Math.random() - 0.5) * 2
      };
      
      if (this.isValidPosition(newPosition, ilot, mutated.filter((_, i) => i !== index))) {
        mutated[index] = { ...ilot, position: newPosition };
      }
    }
    
    return mutated;
  }

  private evaluateLayoutAdvanced(ilots: Ilot[]): number {
    let score = 0;
    
    // Space utilization (primary factor)
    const utilization = this.calculateUtilization(ilots);
    const targetUtilization = this.config.layoutProfile;
    score += 100 - Math.abs(utilization - targetUtilization) * 2;
    
    // Distribution quality
    score += this.calculateDistributionScore(ilots) * 0.3;
    
    // Accessibility score
    score += this.calculateAccessibilityScore(ilots) * 0.2;
    
    // Constraint compliance
    score += this.calculateConstraintScore(ilots) * 0.5;
    
    return score;
  }

  private calculateAccessibilityScore(ilots: Ilot[]): number {
    let accessibleCount = 0;
    
    for (const ilot of ilots) {
      if (this.isIlotAccessible(ilot, ilots)) {
        accessibleCount++;
      }
    }
    
    return (accessibleCount / ilots.length) * 100;
  }

  private isIlotAccessible(ilot: Ilot, allIlots: Ilot[]): boolean {
    // Check if there's a clear path to at least one entrance
    for (const entrance of this.floorPlan.entrances) {
      if (this.hasLingeringPath(ilot.position, entrance.position, allIlots)) {
        return true;
      }
    }
    return false;
  }

  private hasLingeringPath(start: Point, end: Point, obstacles: Ilot[]): boolean {
    // Simplified A* pathfinding
    const steps = 20;
    const dx = (end.x - start.x) / steps;
    const dy = (end.y - start.y) / steps;
    
    for (let i = 1; i < steps; i++) {
      const point = {
        x: start.x + dx * i,
        y: start.y + dy * i
      };
      
      // Check if path intersects with any îlot
      for (const obstacle of obstacles) {
        if (this.pointIntersectsIlot(point, obstacle)) {
          return false;
        }
      }
    }
    
    return true;
  }

  private performMicroOptimizations(ilots: Ilot[]): Ilot[] {
    const optimized = [...ilots];
    
    // Local search optimization
    for (let iteration = 0; iteration < 50; iteration++) {
      let improved = false;
      
      for (let i = 0; i < optimized.length; i++) {
        const ilot = optimized[i];
        const neighbors = this.generateNeighborPositions(ilot.position, 0.2);
        
        for (const newPos of neighbors) {
          if (this.isValidPosition(newPos, ilot, optimized.filter((_, idx) => idx !== i))) {
            const newLayout = [...optimized];
            newLayout[i] = { ...ilot, position: newPos };
            
            if (this.evaluateLayoutAdvanced(newLayout) > this.evaluateLayoutAdvanced(optimized)) {
              optimized[i] = newLayout[i];
              improved = true;
              break;
            }
          }
        }
      }
      
      if (!improved) break;
    }
    
    return optimized;
  }

  // Enhanced utility methods
  private selectOptimalIlotForPosition(position: Point, zone: Room, ilotSizes: any[]): any {
    const availableSpace = this.calculateLocalAvailableSpace(position, zone);
    
    // Select size based on available space and probability weights
    const suitableSizes = ilotSizes.filter(size => 
      size.size <= availableSpace && size.size <= this.config.maxIlotSize
    );
    
    if (suitableSizes.length === 0) return null;
    
    // Weighted random selection
    const totalWeight = suitableSizes.reduce((sum, size) => sum + size.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const size of suitableSizes) {
      random -= size.weight;
      if (random <= 0) return size;
    }
    
    return suitableSizes[0];
  }

  private calculateLocalAvailableSpace(position: Point, zone: Room): number {
    const searchRadius = 4.0;
    let maxSpace = 0;
    
    for (let size = 0.5; size <= searchRadius; size += 0.5) {
      if (this.canPlaceIlotAt(position, size, [])) {
        maxSpace = size;
      } else {
        break;
      }
    }
    
    return maxSpace;
  }

  private createIlot(position: Point, config: any): Ilot {
    const size = Math.sqrt(config.size);
    return {
      id: `ilot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position,
      width: size,
      height: size,
      area: config.size,
      rotation: 0,
      type: config.type || 'standard',
      isPlaced: true
    };
  }

  private calculateUtilization(ilots: Ilot[]): number {
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    return (totalIlotArea / this.floorPlan.availableArea) * 100;
  }

  private markIlotsOnGrid(ilots: Ilot[]): void {
    for (const ilot of ilots) {
      this.markIlotOnGrid(ilot);
    }
  }

  private markIlotOnGrid(ilot: Ilot): void {
    this.markRectangleOnGrid(
      ilot.position,
      ilot.width,
      ilot.height,
      1 // 1 = occupied
    );
  }

  private clearGridOccupancy(): void {
    for (let y = 0; y < this.placementGrid.length; y++) {
      for (let x = 0; x < this.placementGrid[y].length; x++) {
        if (this.placementGrid[y][x] === 1) {
          this.placementGrid[y][x] = 0; // Clear îlot occupancy, keep restrictions
        }
      }
    }
  }

  // Grid utility methods
  private markPolygonOnGrid(polygon: Point[], value: number): void {
    const bounds = this.calculateZoneBounds(polygon);
    const gridBounds = this.worldToGrid(bounds);
    
    for (let y = gridBounds.minY; y <= gridBounds.maxY; y++) {
      for (let x = gridBounds.minX; x <= gridBounds.maxX; x++) {
        const worldPos = this.gridToWorld({ x, y });
        if (this.isPointInPolygon(worldPos, polygon)) {
          this.setGridValue(x, y, value);
        }
      }
    }
  }

  private markRectangleOnGrid(center: Point, width: number, height: number, value: number): void {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    const corners = [
      { x: center.x - halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y - halfHeight },
      { x: center.x + halfWidth, y: center.y + halfHeight },
      { x: center.x - halfWidth, y: center.y + halfHeight }
    ];
    
    this.markPolygonOnGrid(corners, value);
  }

  private markCircleOnGrid(center: Point, radius: number, value: number): void {
    const gridBounds = this.worldToGrid({
      minX: center.x - radius,
      maxX: center.x + radius,
      minY: center.y - radius,
      maxY: center.y + radius,
      width: radius * 2,
      height: radius * 2
    });
    
    for (let y = gridBounds.minY; y <= gridBounds.maxY; y++) {
      for (let x = gridBounds.minX; x <= gridBounds.maxX; x++) {
        const worldPos = this.gridToWorld({ x, y });
        const distance = this.getDistance(worldPos, center);
        if (distance <= radius) {
          this.setGridValue(x, y, value);
        }
      }
    }
  }

  private markWallBufferOnGrid(wall: any, bufferDistance: number): void {
    // Create buffer around wall
    const direction = {
      x: wall.end.x - wall.start.x,
      y: wall.end.y - wall.start.y
    };
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    const normal = { x: -direction.y / length, y: direction.x / length };
    
    const bufferPolygon = [
      {
        x: wall.start.x + normal.x * bufferDistance,
        y: wall.start.y + normal.y * bufferDistance
      },
      {
        x: wall.end.x + normal.x * bufferDistance,
        y: wall.end.y + normal.y * bufferDistance
      },
      {
        x: wall.end.x - normal.x * bufferDistance,
        y: wall.end.y - normal.y * bufferDistance
      },
      {
        x: wall.start.x - normal.x * bufferDistance,
        y: wall.start.y - normal.y * bufferDistance
      }
    ];
    
    this.markPolygonOnGrid(bufferPolygon, -1);
  }

  private worldToGrid(bounds: any): any {
    const floorBounds = this.floorPlan.bounds;
    return {
      minX: Math.max(0, Math.floor((bounds.minX - floorBounds.minX) / this.gridResolution)),
      maxX: Math.min(this.placementGrid[0].length - 1, Math.floor((bounds.maxX - floorBounds.minX) / this.gridResolution)),
      minY: Math.max(0, Math.floor((bounds.minY - floorBounds.minY) / this.gridResolution)),
      maxY: Math.min(this.placementGrid.length - 1, Math.floor((bounds.maxY - floorBounds.minY) / this.gridResolution))
    };
  }

  private gridToWorld(gridPos: Point): Point {
    const floorBounds = this.floorPlan.bounds;
    return {
      x: floorBounds.minX + gridPos.x * this.gridResolution,
      y: floorBounds.minY + gridPos.y * this.gridResolution
    };
  }

  private setGridValue(x: number, y: number, value: number): void {
    if (y >= 0 && y < this.placementGrid.length && x >= 0 && x < this.placementGrid[y].length) {
      this.placementGrid[y][x] = value;
    }
  }

  private getGridValue(x: number, y: number): number {
    if (y >= 0 && y < this.placementGrid.length && x >= 0 && x < this.placementGrid[y].length) {
      return this.placementGrid[y][x];
    }
    return -1; // Out of bounds = restricted
  }

  private isGridPositionAvailable(position: Point): boolean {
    const gridPos = this.worldToGrid({
      minX: position.x,
      maxX: position.x,
      minY: position.y,
      maxY: position.y,
      width: 0,
      height: 0
    });
    
    return this.getGridValue(gridPos.minX, gridPos.minY) === 0;
  }

  // Existing utility methods (enhanced)
  private canPlaceIlotAt(position: Point, size: number, existingIlots: Ilot[]): boolean {
    const halfSize = size / 2;
    
    // Check grid availability
    const corners = [
      { x: position.x - halfSize, y: position.y - halfSize },
      { x: position.x + halfSize, y: position.y - halfSize },
      { x: position.x + halfSize, y: position.y + halfSize },
      { x: position.x - halfSize, y: position.y + halfSize }
    ];
    
    for (const corner of corners) {
      if (!this.isGridPositionAvailable(corner)) return false;
    }
    
    // Check overlap with existing îlots
    for (const existing of existingIlots) {
      const distance = this.getDistance(position, existing.position);
      const minDistance = halfSize + Math.max(existing.width, existing.height) / 2 + this.config.minIlotSpacing;
      if (distance < minDistance) return false;
    }
    
    return true;
  }

  private findTriangularGap(zone: Room): Point | null {
    const bounds = this.calculateZoneBounds(zone.boundaries);
    
    for (let attempt = 0; attempt < 50; attempt++) {
      const position = {
        x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY)
      };
      
      if (this.isPositionInZone(position, zone) && this.isGridPositionAvailable(position)) {
        return position;
      }
    }
    
    return null;
  }

  private generateNeighborPositions(center: Point, radius: number): Point[] {
    const neighbors: Point[] = [];
    const steps = 8;
    
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      neighbors.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    }
    
    return neighbors;
  }

  private calculateZoneBounds(boundaries: Point[]): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } {
    const minX = Math.min(...boundaries.map(p => p.x));
    const maxX = Math.max(...boundaries.map(p => p.x));
    const minY = Math.min(...boundaries.map(p => p.y));
    const maxY = Math.max(...boundaries.map(p => p.y));
    
    return {
      minX, maxX, minY, maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private isPositionInZone(position: Point, zone: Room): boolean {
    return this.isPointInPolygon(position, zone.boundaries);
  }

  private isValidPosition(position: Point, ilot: Ilot, otherIlots: Ilot[]): boolean {
    // Check if position is in any available zone
    const inZone = this.floorPlan.rooms.some(room => 
      room.type === 'available' && this.isPositionInZone(position, room)
    );
    
    if (!inZone) return false;
    
    return this.canPlaceIlotAt(position, Math.max(ilot.width, ilot.height), otherIlots);
  }

  private pointIntersectsIlot(point: Point, ilot: Ilot): boolean {
    const halfWidth = ilot.width / 2;
    const halfHeight = ilot.height / 2;
    
    return point.x >= ilot.position.x - halfWidth &&
           point.x <= ilot.position.x + halfWidth &&
           point.y >= ilot.position.y - halfHeight &&
           point.y <= ilot.position.y + halfHeight;
  }

  private calculateDistributionScore(ilots: Ilot[]): number {
    if (ilots.length < 2) return 0;
    
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < ilots.length; i++) {
      for (let j = i + 1; j < ilots.length; j++) {
        totalDistance += this.getDistance(ilots[i].position, ilots[j].position);
        pairCount++;
      }
    }
    
    return pairCount > 0 ? totalDistance / pairCount : 0;
  }

  private calculateConstraintScore(ilots: Ilot[]): number {
    let score = 100;
    
    for (const ilot of ilots) {
      // Penalty for being too close to restricted areas
      for (const restricted of this.floorPlan.restrictedAreas) {
        const distance = this.getDistanceToPolygon(ilot.position, restricted.boundaries);
        if (distance < 1.5) {
          score -= (1.5 - distance) * 10;
        }
      }
      
      // Penalty for being too close to entrances
      for (const entrance of this.floorPlan.entrances) {
        const distance = this.getDistance(ilot.position, entrance.position);
        if (distance < 2.5) {
          score -= (2.5 - distance) * 15;
        }
      }
    }
    
    return Math.max(0, score);
  }

  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    const n = polygon.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  private getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private getDistanceToPolygon(point: Point, polygon: Point[]): number {
    let minDistance = Infinity;
    
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const distance = this.getDistanceToLineSegment(point, polygon[i], polygon[j]);
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  private getDistanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return this.getDistance(point, lineStart);
    
    let t = Math.max(0, Math.min(1, dot / lenSq));
    
    const projection = {
      x: lineStart.x + t * C,
      y: lineStart.y + t * D
    };
    
    return this.getDistance(point, projection);
  }
}
