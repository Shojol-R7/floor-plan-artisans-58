import { FloorPlan, PlacementConfig } from '@/types/floorplan';

export class FloorPlanExporter {
  static exportAsJSON(floorPlan: FloorPlan, config: PlacementConfig): void {
    const exportData = {
      metadata: {
        exportVersion: '1.0',
        timestamp: new Date().toISOString(),
        generator: 'Floor Plan Artisans v1.0'
      },
      floorPlan,
      configuration: config,
      statistics: this.calculateStatistics(floorPlan),
      analysis: this.generateAnalysis(floorPlan, config)
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    this.downloadFile(blob, `floor-plan-${floorPlan.name}-${Date.now()}.json`);
  }

  static exportAsDXF(floorPlan: FloorPlan): void {
    const dxfContent = this.generateDXF(floorPlan);
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    this.downloadFile(blob, `floor-plan-${floorPlan.name}-${Date.now()}.dxf`);
  }

  static exportAsPDF(floorPlan: FloorPlan): void {
    // In a real implementation, this would generate a professional PDF report
    const reportData = this.generatePDFReport(floorPlan);
    const blob = new Blob([reportData], { type: 'application/pdf' });
    this.downloadFile(blob, `floor-plan-report-${floorPlan.name}-${Date.now()}.pdf`);
  }

  private static calculateStatistics(floorPlan: FloorPlan) {
    const totalIlotArea = floorPlan.ilots.reduce((sum, ilot) => sum + ilot.area, 0);
    const totalCorridorLength = floorPlan.corridors.reduce((sum, corridor) => sum + corridor.length, 0);
    
    return {
      totalArea: floorPlan.totalArea,
      availableArea: floorPlan.availableArea,
      utilizedArea: totalIlotArea,
      utilizationRate: (totalIlotArea / floorPlan.availableArea) * 100,
      ilotCount: floorPlan.ilots.length,
      corridorCount: floorPlan.corridors.length,
      totalCorridorLength,
      averageIlotSize: floorPlan.ilots.length > 0 ? totalIlotArea / floorPlan.ilots.length : 0,
      restrictedAreaCount: floorPlan.restrictedAreas.length,
      entranceCount: floorPlan.entrances.length
    };
  }

  private static generateAnalysis(floorPlan: FloorPlan, config: PlacementConfig) {
    const stats = this.calculateStatistics(floorPlan);
    
    return {
      layoutEfficiency: this.assessLayoutEfficiency(stats, config),
      accessibilityCompliance: this.assessAccessibility(floorPlan),
      circulationAnalysis: this.analyzeCirculation(floorPlan),
      recommendations: this.generateRecommendations(floorPlan, stats)
    };
  }

  private static assessLayoutEfficiency(stats: any, config: PlacementConfig): string {
    const targetUtilization = config.layoutProfile;
    const actualUtilization = stats.utilizationRate;
    
    if (Math.abs(actualUtilization - targetUtilization) < 5) {
      return 'Excellent - Layout meets target density within optimal range';
    } else if (actualUtilization < targetUtilization - 5) {
      return 'Good - Layout is conservative with room for additional îlots';
    } else {
      return 'Attention - Layout exceeds target density, consider reducing îlot count';
    }
  }

  private static assessAccessibility(floorPlan: FloorPlan): string {
    // Check corridor widths
    const narrowCorridors = floorPlan.corridors.filter(c => c.width < 1.2);
    
    if (narrowCorridors.length === 0) {
      return 'Compliant - All corridors meet accessibility standards (≥1.2m)';
    } else {
      return `Warning - ${narrowCorridors.length} corridor(s) below minimum width`;
    }
  }

  private static analyzeCirculation(floorPlan: FloorPlan): string {
    const totalCorridorLength = floorPlan.corridors.reduce((sum, c) => sum + c.length, 0);
    const efficiency = (floorPlan.availableArea - totalCorridorLength * 1.2) / floorPlan.availableArea;
    
    if (efficiency > 0.8) {
      return 'Efficient - Minimal circulation space with good connectivity';
    } else if (efficiency > 0.7) {
      return 'Adequate - Balanced circulation and usable space';
    } else {
      return 'Review - High circulation overhead, consider optimization';
    }
  }

  private static generateRecommendations(floorPlan: FloorPlan, stats: any): string[] {
    const recommendations: string[] = [];
    
    if (stats.utilizationRate < 20) {
      recommendations.push('Consider increasing îlot density for better space utilization');
    }
    
    if (stats.corridorCount > stats.ilotCount * 0.5) {
      recommendations.push('Optimize corridor network to reduce circulation overhead');
    }
    
    if (floorPlan.entrances.length < 2) {
      recommendations.push('Consider adding emergency exits for safety compliance');
    }
    
    if (stats.averageIlotSize < 4) {
      recommendations.push('Larger îlots may improve space efficiency and reduce complexity');
    }
    
    return recommendations;
  }

  private static generateDXF(floorPlan: FloorPlan): string {
    // Generate basic DXF content
    let dxf = '0\nSECTION\n2\nHEADER\n';
    dxf += '0\nENDSEC\n';
    dxf += '0\nSECTION\n2\nTABLES\n';
    dxf += '0\nENDSEC\n';
    dxf += '0\nSECTION\n2\nBLOCKS\n';
    dxf += '0\nENDSEC\n';
    dxf += '0\nSECTION\n2\nENTITIES\n';
    
    // Add walls as lines
    floorPlan.walls.forEach((wall, index) => {
      dxf += '0\nLINE\n';
      dxf += '8\nWALLS\n';
      dxf += `10\n${wall.start.x}\n`;
      dxf += `20\n${wall.start.y}\n`;
      dxf += `11\n${wall.end.x}\n`;
      dxf += `21\n${wall.end.y}\n`;
    });
    
    // Add îlots as rectangles
    floorPlan.ilots.forEach((ilot, index) => {
      const halfWidth = ilot.width / 2;
      const halfHeight = ilot.height / 2;
      
      // Create rectangle using 4 lines
      const corners = [
        { x: ilot.position.x - halfWidth, y: ilot.position.y - halfHeight },
        { x: ilot.position.x + halfWidth, y: ilot.position.y - halfHeight },
        { x: ilot.position.x + halfWidth, y: ilot.position.y + halfHeight },
        { x: ilot.position.x - halfWidth, y: ilot.position.y + halfHeight }
      ];
      
      for (let i = 0; i < 4; i++) {
        const start = corners[i];
        const end = corners[(i + 1) % 4];
        
        dxf += '0\nLINE\n';
        dxf += '8\nILOTS\n';
        dxf += `10\n${start.x}\n`;
        dxf += `20\n${start.y}\n`;
        dxf += `11\n${end.x}\n`;
        dxf += `21\n${end.y}\n`;
      }
    });
    
    dxf += '0\nENDSEC\n';
    dxf += '0\nEOF\n';
    
    return dxf;
  }

  private static generatePDFReport(floorPlan: FloorPlan): string {
    // In a real implementation, this would generate a proper PDF
    // For now, return a text report
    const stats = this.calculateStatistics(floorPlan);
    
    return `FLOOR PLAN ANALYSIS REPORT
    
Project: ${floorPlan.name}
Generated: ${new Date().toLocaleDateString()}

SUMMARY STATISTICS:
- Total Area: ${stats.totalArea.toFixed(1)} m²
- Available Area: ${stats.availableArea.toFixed(1)} m²
- Utilization Rate: ${stats.utilizationRate.toFixed(1)}%
- Number of Îlots: ${stats.ilotCount}
- Number of Corridors: ${stats.corridorCount}
- Total Corridor Length: ${stats.totalCorridorLength.toFixed(1)} m

COMPLIANCE CHECK:
- Accessibility: ${this.assessAccessibility(floorPlan)}
- Layout Efficiency: ${this.assessLayoutEfficiency(stats, { layoutProfile: 25 } as PlacementConfig)}

RECOMMENDATIONS:
${this.generateRecommendations(floorPlan, stats).map(r => `- ${r}`).join('\n')}
`;
  }

  private static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}