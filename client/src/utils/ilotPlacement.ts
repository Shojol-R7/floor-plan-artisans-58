import { FloorPlan, Ilot, Point, PlacementConfig, Room, RestrictedArea, Entrance } from '@/types/floorplan';

export class IntelligentIlotPlacer {
  private config: PlacementConfig;
  private floorPlan: FloorPlan;

  constructor(floorPlan: FloorPlan, config: PlacementConfig) {
    this.floorPlan = floorPlan;
    this.config = config;
  }

  placeIlots(): Ilot[] {
    const availableZones = this.identifyAvailableZones();
    const ilotSizes = this.calculateOptimalIlotSizes();
    const placedIlots: Ilot[] = [];

    // Sort zones by area (largest first for optimal placement)
    const sortedZones = availableZones.sort((a, b) => b.area - a.area);

    for (const zone of sortedZones) {
      const zoneIlots = this.placeIlotsInZone(zone, ilotSizes);
      placedIlots.push(...zoneIlots);
    }

    return this.optimizePlacement(placedIlots);
  }

  private identifyAvailableZones(): Room[] {
    return this.floorPlan.rooms.filter(room => {
      // Only use rooms marked as available
      if (room.type !== 'available') return false;
      
      // Check minimum area requirement
      if (room.area < 10) return false; // Minimum 10 m²
      
      // Check if zone is too close to entrances
      const tooCloseToEntrance = this.floorPlan.entrances.some(entrance => {
        return this.isPointNearEntrance(this.getCenterPoint(room.boundaries), entrance);
      });
      
      return !tooCloseToEntrance;
    });
  }

  private calculateOptimalIlotSizes(): { small: number; medium: number; large: number } {
    const totalAvailableArea = this.floorPlan.availableArea;
    const targetIlotArea = totalAvailableArea * (this.config.layoutProfile / 100);
    
    // Professional îlot sizing based on retail standards
    return {
      small: 4,   // 2m x 2m
      medium: 9,  // 3m x 3m
      large: 16   // 4m x 4m
    };
  }

  private placeIlotsInZone(zone: Room, ilotSizes: any): Ilot[] {
    const placedIlots: Ilot[] = [];
    const zoneBounds = this.calculateZoneBounds(zone.boundaries);
    
    // Grid-based placement algorithm
    const gridSpacing = 2.0; // 2m grid
    const margin = 1.0; // 1m margin from walls
    
    for (let x = zoneBounds.minX + margin; x < zoneBounds.maxX - margin; x += gridSpacing) {
      for (let y = zoneBounds.minY + margin; y < zoneBounds.maxY - margin; y += gridSpacing) {
        const position = { x, y };
        
        if (!this.isValidIlotPosition(position, zone)) continue;
        
        // Determine îlot size based on available space
        const ilotSize = this.selectOptimalIlotSize(position, zone, ilotSizes);
        if (!ilotSize) continue;
        
        // Check if îlot fits without overlapping others
        if (this.wouldOverlapExistingIlots(position, ilotSize, placedIlots)) continue;
        
        // Create and place îlot
        const ilot: Ilot = {
          id: `ilot_${placedIlots.length + 1}`,
          position,
          width: Math.sqrt(ilotSize.area),
          height: Math.sqrt(ilotSize.area),
          area: ilotSize.area,
          rotation: 0,
          type: ilotSize.type,
          isPlaced: true
        };
        
        placedIlots.push(ilot);
        
        // Skip ahead to avoid overcrowding
        x += ilot.width + this.config.minIlotSpacing;
      }
    }
    
    return placedIlots;
  }

  private isValidIlotPosition(position: Point, zone: Room): boolean {
    // Check if position is within zone boundaries
    if (!this.isPointInPolygon(position, zone.boundaries)) return false;
    
    // Check distance from restricted areas
    for (const restricted of this.floorPlan.restrictedAreas) {
      if (this.getDistanceToPolygon(position, restricted.boundaries) < 2.0) {
        return false;
      }
    }
    
    // Check distance from entrances
    for (const entrance of this.floorPlan.entrances) {
      if (this.getDistance(position, entrance.position) < 3.0) {
        return false;
      }
    }
    
    return true;
  }

  private selectOptimalIlotSize(
    position: Point,
    zone: Room,
    ilotSizes: any
  ): { area: number; type: 'small' | 'medium' | 'large' } | null {
    const availableSpace = this.calculateAvailableSpaceAt(position, zone);
    
    if (availableSpace >= ilotSizes.large) {
      return { area: ilotSizes.large, type: 'large' };
    } else if (availableSpace >= ilotSizes.medium) {
      return { area: ilotSizes.medium, type: 'medium' };
    } else if (availableSpace >= ilotSizes.small) {
      return { area: ilotSizes.small, type: 'small' };
    }
    
    return null;
  }

  private calculateAvailableSpaceAt(position: Point, zone: Room): number {
    // Calculate available rectangular space at position
    const zoneBounds = this.calculateZoneBounds(zone.boundaries);
    const maxWidth = zoneBounds.maxX - position.x;
    const maxHeight = zoneBounds.maxY - position.y;
    
    return Math.min(maxWidth, maxHeight, this.config.maxIlotSize);
  }

  private wouldOverlapExistingIlots(position: Point, ilotSize: any, existingIlots: Ilot[]): boolean {
    const margin = this.config.minIlotSpacing;
    const halfSize = Math.sqrt(ilotSize.area) / 2;
    
    for (const existingIlot of existingIlots) {
      const existingHalfWidth = existingIlot.width / 2;
      const existingHalfHeight = existingIlot.height / 2;
      
      const distance = this.getDistance(position, existingIlot.position);
      const minDistance = halfSize + Math.max(existingHalfWidth, existingHalfHeight) + margin;
      
      if (distance < minDistance) return true;
    }
    
    return false;
  }

  private optimizePlacement(ilots: Ilot[]): Ilot[] {
    // Advanced optimization using simulated annealing or genetic algorithm
    // For now, implement basic spacing optimization
    
    let optimized = [...ilots];
    let improved = true;
    
    while (improved) {
      improved = false;
      
      for (let i = 0; i < optimized.length; i++) {
        const originalPosition = optimized[i].position;
        const candidates = this.generatePositionCandidates(originalPosition);
        
        for (const candidate of candidates) {
          if (this.isValidIlotPosition(candidate, this.floorPlan.rooms[0])) {
            // Test if this position improves overall layout
            optimized[i].position = candidate;
            
            if (this.evaluateLayout(optimized) > this.evaluateLayout(ilots)) {
              improved = true;
              break;
            } else {
              optimized[i].position = originalPosition;
            }
          }
        }
      }
    }
    
    return optimized;
  }

  private generatePositionCandidates(center: Point): Point[] {
    const radius = 1.0;
    const candidates: Point[] = [];
    
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
      candidates.push({
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    }
    
    return candidates;
  }

  private evaluateLayout(ilots: Ilot[]): number {
    let score = 0;
    
    // Reward even distribution
    score += this.calculateDistributionScore(ilots);
    
    // Reward efficient space usage
    score += this.calculateSpaceEfficiencyScore(ilots);
    
    // Penalize constraint violations
    score -= this.calculateViolationPenalty(ilots);
    
    return score;
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

  private calculateSpaceEfficiencyScore(ilots: Ilot[]): number {
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const utilizationRatio = totalIlotArea / this.floorPlan.availableArea;
    
    // Optimal utilization is around the target layout profile
    const targetRatio = this.config.layoutProfile / 100;
    return 100 - Math.abs(utilizationRatio - targetRatio) * 100;
  }

  private calculateViolationPenalty(ilots: Ilot[]): number {
    let penalty = 0;
    
    for (const ilot of ilots) {
      // Penalty for being too close to restricted areas
      for (const restricted of this.floorPlan.restrictedAreas) {
        const distance = this.getDistanceToPolygon(ilot.position, restricted.boundaries);
        if (distance < 2.0) {
          penalty += (2.0 - distance) * 10;
        }
      }
      
      // Penalty for being too close to entrances
      for (const entrance of this.floorPlan.entrances) {
        const distance = this.getDistance(ilot.position, entrance.position);
        if (distance < 3.0) {
          penalty += (3.0 - distance) * 15;
        }
      }
    }
    
    return penalty;
  }

  // Utility functions
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

  private calculateZoneBounds(boundaries: Point[]) {
    return {
      minX: Math.min(...boundaries.map(p => p.x)),
      maxX: Math.max(...boundaries.map(p => p.x)),
      minY: Math.min(...boundaries.map(p => p.y)),
      maxY: Math.max(...boundaries.map(p => p.y))
    };
  }

  private getCenterPoint(boundaries: Point[]): Point {
    const bounds = this.calculateZoneBounds(boundaries);
    return {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2
    };
  }

  private isPointNearEntrance(point: Point, entrance: Entrance): boolean {
    return this.getDistance(point, entrance.position) < 4.0; // 4m clearance
  }
}