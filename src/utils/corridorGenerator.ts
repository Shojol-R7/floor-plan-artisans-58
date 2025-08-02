import { Ilot, Corridor, Point, FloorPlan } from '@/types/floorplan';

export class IntelligentCorridorGenerator {
  private floorPlan: FloorPlan;
  private corridorWidth: number;

  constructor(floorPlan: FloorPlan, corridorWidth: number = 1.2) {
    this.floorPlan = floorPlan;
    this.corridorWidth = corridorWidth;
  }

  generateCorridors(ilots: Ilot[]): Corridor[] {
    const corridors: Corridor[] = [];
    const ilotRows = this.groupIlotsIntoRows(ilots);
    
    // Generate corridors between facing rows
    for (let i = 0; i < ilotRows.length; i++) {
      for (let j = i + 1; j < ilotRows.length; j++) {
        const corridor = this.createCorridorBetweenRows(ilotRows[i], ilotRows[j]);
        if (corridor) {
          corridors.push(corridor);
        }
      }
    }
    
    // Generate main circulation corridors
    const mainCorridors = this.generateMainCirculationCorridors(ilots);
    corridors.push(...mainCorridors);
    
    // Optimize corridor network
    return this.optimizeCorridorNetwork(corridors);
  }

  private groupIlotsIntoRows(ilots: Ilot[]): Ilot[][] {
    const rows: Ilot[][] = [];
    const processedIlots = new Set<string>();
    
    for (const ilot of ilots) {
      if (processedIlots.has(ilot.id)) continue;
      
      const row = this.findIlotsInSameRow(ilot, ilots, processedIlots);
      if (row.length > 0) {
        rows.push(row);
        row.forEach(i => processedIlots.add(i.id));
      }
    }
    
    return rows;
  }

  private findIlotsInSameRow(targetIlot: Ilot, allIlots: Ilot[], processedIlots: Set<string>): Ilot[] {
    const row = [targetIlot];
    const tolerance = 2.0; // 2m tolerance for row alignment
    
    for (const ilot of allIlots) {
      if (ilot.id === targetIlot.id || processedIlots.has(ilot.id)) continue;
      
      // Check if îlots are roughly aligned horizontally or vertically
      const deltaX = Math.abs(ilot.position.x - targetIlot.position.x);
      const deltaY = Math.abs(ilot.position.y - targetIlot.position.y);
      
      if (deltaY < tolerance || deltaX < tolerance) {
        row.push(ilot);
      }
    }
    
    return row;
  }

  private createCorridorBetweenRows(row1: Ilot[], row2: Ilot[]): Corridor | null {
    if (!this.areRowsFacing(row1, row2)) return null;
    
    const corridor = this.calculateOptimalCorridorPath(row1, row2);
    if (!corridor) return null;
    
    // Validate corridor doesn't overlap with îlots
    if (this.doesCorridorOverlapIlots(corridor, [...row1, ...row2])) return null;
    
    return {
      id: `corridor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      path: corridor.path,
      width: this.corridorWidth,
      connectsIlots: [...row1.map(i => i.id), ...row2.map(i => i.id)],
      length: this.calculatePathLength(corridor.path)
    };
  }

  private areRowsFacing(row1: Ilot[], row2: Ilot[]): boolean {
    // Calculate average positions of rows
    const avgPos1 = this.calculateAveragePosition(row1);
    const avgPos2 = this.calculateAveragePosition(row2);
    
    // Check if rows are parallel and facing each other
    const distance = this.getDistance(avgPos1, avgPos2);
    
    // Rows should be close enough to warrant a corridor
    return distance > 3.0 && distance < 8.0;
  }

  private calculateOptimalCorridorPath(row1: Ilot[], row2: Ilot[]): { path: Point[] } | null {
    const avgPos1 = this.calculateAveragePosition(row1);
    const avgPos2 = this.calculateAveragePosition(row2);
    
    // Create straight corridor path between rows
    const path: Point[] = [];
    
    // Start from edge of first row
    const edge1 = this.findClosestEdgePoint(row1, avgPos2);
    const edge2 = this.findClosestEdgePoint(row2, avgPos1);
    
    if (!edge1 || !edge2) return null;
    
    // Create corridor path that touches both rows
    path.push(edge1);
    
    // Add intermediate points if needed for complex paths
    const midPoint = {
      x: (edge1.x + edge2.x) / 2,
      y: (edge1.y + edge2.y) / 2
    };
    
    // Only add midpoint if path needs to avoid obstacles
    if (this.needsIntermediatePoint(edge1, edge2)) {
      path.push(midPoint);
    }
    
    path.push(edge2);
    
    return { path };
  }

  private findClosestEdgePoint(row: Ilot[], targetPoint: Point): Point | null {
    let closestPoint: Point | null = null;
    let minDistance = Infinity;
    
    for (const ilot of row) {
      // Calculate edge points of the îlot
      const edges = this.getIlotEdgePoints(ilot);
      
      for (const edge of edges) {
        const distance = this.getDistance(edge, targetPoint);
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = edge;
        }
      }
    }
    
    return closestPoint;
  }

  private getIlotEdgePoints(ilot: Ilot): Point[] {
    const halfWidth = ilot.width / 2;
    const halfHeight = ilot.height / 2;
    const center = ilot.position;
    
    return [
      { x: center.x - halfWidth, y: center.y }, // Left
      { x: center.x + halfWidth, y: center.y }, // Right
      { x: center.x, y: center.y - halfHeight }, // Top
      { x: center.x, y: center.y + halfHeight }  // Bottom
    ];
  }

  private needsIntermediatePoint(start: Point, end: Point): boolean {
    // Check if direct path would intersect with walls or obstacles
    const directPath = [start, end];
    
    // For now, return false - in complex scenarios, implement obstacle detection
    return false;
  }

  private doesCorridorOverlapIlots(corridor: { path: Point[] }, ilots: Ilot[]): boolean {
    const corridorBounds = this.calculateCorridorBounds(corridor.path);
    
    for (const ilot of ilots) {
      const ilotBounds = this.getIlotBounds(ilot);
      
      if (this.doBoundsOverlap(corridorBounds, ilotBounds)) {
        return true;
      }
    }
    
    return false;
  }

  private calculateCorridorBounds(path: Point[]) {
    const halfWidth = this.corridorWidth / 2;
    
    return {
      minX: Math.min(...path.map(p => p.x)) - halfWidth,
      maxX: Math.max(...path.map(p => p.x)) + halfWidth,
      minY: Math.min(...path.map(p => p.y)) - halfWidth,
      maxY: Math.max(...path.map(p => p.y)) + halfWidth
    };
  }

  private getIlotBounds(ilot: Ilot) {
    const halfWidth = ilot.width / 2;
    const halfHeight = ilot.height / 2;
    
    return {
      minX: ilot.position.x - halfWidth,
      maxX: ilot.position.x + halfWidth,
      minY: ilot.position.y - halfHeight,
      maxY: ilot.position.y + halfHeight
    };
  }

  private doBoundsOverlap(bounds1: any, bounds2: any): boolean {
    return !(bounds1.maxX < bounds2.minX || 
             bounds2.maxX < bounds1.minX || 
             bounds1.maxY < bounds2.minY || 
             bounds2.maxY < bounds1.minY);
  }

  private generateMainCirculationCorridors(ilots: Ilot[]): Corridor[] {
    const mainCorridors: Corridor[] = [];
    
    // Generate primary circulation spine
    const spineCorridors = this.createCirculationSpine(ilots);
    mainCorridors.push(...spineCorridors);
    
    // Generate secondary access corridors
    const accessCorridors = this.createAccessCorridors(ilots);
    mainCorridors.push(...accessCorridors);
    
    return mainCorridors;
  }

  private createCirculationSpine(ilots: Ilot[]): Corridor[] {
    if (ilots.length === 0) return [];
    
    // Create main circulation path through the space
    const bounds = this.calculateIlotsBounds(ilots);
    const spineWidth = Math.max(this.corridorWidth, 2.0); // Minimum 2m for main spine
    
    // Create horizontal spine
    const horizontalSpine: Corridor = {
      id: `spine_horizontal_${Date.now()}`,
      path: [
        { x: bounds.minX - 1, y: (bounds.minY + bounds.maxY) / 2 },
        { x: bounds.maxX + 1, y: (bounds.minY + bounds.maxY) / 2 }
      ],
      width: spineWidth,
      connectsIlots: ilots.map(i => i.id),
      length: bounds.maxX - bounds.minX + 2
    };
    
    return [horizontalSpine];
  }

  private createAccessCorridors(ilots: Ilot[]): Corridor[] {
    const accessCorridors: Corridor[] = [];
    
    // Create corridors to connect isolated îlots to main circulation
    for (const ilot of ilots) {
      if (!this.isIlotConnectedToMainCirculation(ilot)) {
        const accessCorridor = this.createAccessCorridorForIlot(ilot);
        if (accessCorridor) {
          accessCorridors.push(accessCorridor);
        }
      }
    }
    
    return accessCorridors;
  }

  private isIlotConnectedToMainCirculation(ilot: Ilot): boolean {
    // Check if îlot has access to main circulation
    // For now, assume all îlots need access corridors
    return false;
  }

  private createAccessCorridorForIlot(ilot: Ilot): Corridor | null {
    // Create access corridor from îlot to nearest main circulation
    const nearestSpinePoint = this.findNearestSpinePoint(ilot);
    
    if (!nearestSpinePoint) return null;
    
    return {
      id: `access_${ilot.id}_${Date.now()}`,
      path: [
        ilot.position,
        nearestSpinePoint
      ],
      width: this.corridorWidth,
      connectsIlots: [ilot.id],
      length: this.getDistance(ilot.position, nearestSpinePoint)
    };
  }

  private findNearestSpinePoint(ilot: Ilot): Point | null {
    // Find nearest point on main circulation spine
    const bounds = this.calculateIlotsBounds([ilot]);
    
    // Return point on horizontal spine
    return {
      x: ilot.position.x,
      y: bounds.minY - 2 // 2m from îlot
    };
  }

  private optimizeCorridorNetwork(corridors: Corridor[]): Corridor[] {
    // Remove duplicate corridors
    const uniqueCorridors = this.removeDuplicateCorridors(corridors);
    
    // Merge adjacent corridors
    const mergedCorridors = this.mergeAdjacentCorridors(uniqueCorridors);
    
    // Validate all corridors
    return mergedCorridors.filter(corridor => this.isValidCorridor(corridor));
  }

  private removeDuplicateCorridors(corridors: Corridor[]): Corridor[] {
    const unique: Corridor[] = [];
    
    for (const corridor of corridors) {
      const isDuplicate = unique.some(existing => 
        this.areCorridorsSimilar(corridor, existing)
      );
      
      if (!isDuplicate) {
        unique.push(corridor);
      }
    }
    
    return unique;
  }

  private areCorridorsSimilar(corridor1: Corridor, corridor2: Corridor): boolean {
    // Check if corridors have similar paths
    if (corridor1.path.length !== corridor2.path.length) return false;
    
    const tolerance = 0.5; // 50cm tolerance
    
    for (let i = 0; i < corridor1.path.length; i++) {
      const distance = this.getDistance(corridor1.path[i], corridor2.path[i]);
      if (distance > tolerance) return false;
    }
    
    return true;
  }

  private mergeAdjacentCorridors(corridors: Corridor[]): Corridor[] {
    // Implementation for merging adjacent corridors
    // For now, return as-is
    return corridors;
  }

  private isValidCorridor(corridor: Corridor): boolean {
    // Validate corridor constraints
    return corridor.path.length >= 2 && 
           corridor.width > 0 && 
           corridor.length > 0;
  }

  // Utility functions
  private calculateAveragePosition(ilots: Ilot[]): Point {
    const sum = ilots.reduce(
      (acc, ilot) => ({
        x: acc.x + ilot.position.x,
        y: acc.y + ilot.position.y
      }),
      { x: 0, y: 0 }
    );
    
    return {
      x: sum.x / ilots.length,
      y: sum.y / ilots.length
    };
  }

  private calculateIlotsBounds(ilots: Ilot[]) {
    const positions = ilots.map(i => i.position);
    
    return {
      minX: Math.min(...positions.map(p => p.x)),
      maxX: Math.max(...positions.map(p => p.x)),
      minY: Math.min(...positions.map(p => p.y)),
      maxY: Math.max(...positions.map(p => p.y))
    };
  }

  private calculatePathLength(path: Point[]): number {
    let length = 0;
    
    for (let i = 1; i < path.length; i++) {
      length += this.getDistance(path[i - 1], path[i]);
    }
    
    return length;
  }

  private getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
}