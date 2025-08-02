
import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Circle, Text, Group, Path } from 'react-konva';
import { FloorPlan, Ilot, Corridor, Wall, Room, RestrictedArea, Entrance } from '@/types/floorplan';

interface FloorPlanCanvasProps {
  floorPlan: FloorPlan;
  showIlots?: boolean;
  showCorridors?: boolean;
  showMeasurements?: boolean;
  stage: 'empty' | 'parsed' | 'processed' | 'placed' | 'corridors';
  onElementClick?: (id: string, type: string) => void;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  floorPlan,
  showIlots = false,
  showCorridors = false,
  showMeasurements = false,
  stage,
  onElementClick
}) => {
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced canvas dimensions and scaling
  const canvasWidth = 800;
  const canvasHeight = 600;
  const padding = 40;

  // Calculate precision scaling for professional rendering
  const bounds = floorPlan.bounds;
  const planWidth = bounds.maxX - bounds.minX;
  const planHeight = bounds.maxY - bounds.minY;
  
  const scaleX = (canvasWidth - 2 * padding) / planWidth;
  const scaleY = (canvasHeight - 2 * padding) / planHeight;
  const scale = Math.min(scaleX, scaleY) * 0.85; // 85% for better visibility

  const offsetX = (canvasWidth - planWidth * scale) / 2;
  const offsetY = (canvasHeight - planHeight * scale) / 2;

  // Professional coordinate transformation
  const transformPoint = (x: number, y: number) => ({
    x: offsetX + (x - bounds.minX) * scale,
    y: offsetY + (y - bounds.minY) * scale
  });

  // Enhanced visual rendering functions
  const renderWalls = () => {
    return floorPlan.walls.map((wall: Wall) => {
      const start = transformPoint(wall.start.x, wall.start.y);
      const end = transformPoint(wall.end.x, wall.end.y);
      
      // Advanced wall styling based on stage and type
      let strokeColor = '#2c3e50';
      let strokeWidth = 3;
      let opacity = 1;
      
      if (stage === 'parsed') {
        strokeColor = '#e74c3c'; // Raw data - red
        strokeWidth = 2;
        opacity = 0.7;
      } else if (stage === 'processed') {
        strokeColor = '#27ae60'; // Processed - green
        strokeWidth = 3;
        opacity = 0.9;
      } else {
        // Final stages - professional black
        strokeColor = wall.type === 'exterior' ? '#1a1a1a' : '#34495e';
        strokeWidth = wall.type === 'exterior' ? 4 : 3;
      }

      console.log(`Rendering wall ${wall.id} from (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);

      return (
        <Group key={wall.id}>
          {/* Wall shadow for depth */}
          <Line
            points={[start.x + 1, start.y + 1, end.x + 1, end.y + 1]}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={strokeWidth}
            lineCap="round"
          />
          {/* Main wall */}
          <Line
            points={[start.x, start.y, end.x, end.y]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            lineCap="round"
            opacity={opacity}
            onClick={() => onElementClick?.(wall.id, 'wall')}
          />
          {/* Wall thickness representation */}
          {stage !== 'parsed' && (
            <Line
              points={[start.x, start.y, end.x, end.y]}
              stroke={strokeColor}
              strokeWidth={strokeWidth + wall.thickness * scale}
              lineCap="round"
              opacity={0.3}
            />
          )}
        </Group>
      );
    });
  };

  const renderRooms = () => {
    return floorPlan.rooms.map((room: Room) => {
      if (room.boundaries.length < 3) return null;

      const points = room.boundaries.flatMap(point => {
        const transformed = transformPoint(point.x, point.y);
        return [transformed.x, transformed.y];
      });

      // Professional room styling based on stage
      let fillColor = 'rgba(247, 249, 252, 0.6)';
      let strokeColor = '#bdc3c7';
      
      if (stage === 'parsed') {
        fillColor = room.type === 'available' ? 'rgba(255, 243, 224, 0.4)' : 'rgba(255, 235, 238, 0.4)';
        strokeColor = '#f39c12';
      } else if (stage === 'processed') {
        fillColor = room.type === 'available' ? 'rgba(232, 245, 233, 0.6)' : 'rgba(255, 235, 238, 0.4)';
        strokeColor = '#27ae60';
      } else {
        fillColor = room.type === 'available' ? 'rgba(240, 248, 255, 0.7)' : 'rgba(255, 245, 245, 0.5)';
        strokeColor = '#95a5a6';
      }

      return (
        <Group key={room.id}>
          <Line
            points={points}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={1.5}
            closed={true}
            onClick={() => onElementClick?.(room.id, 'room')}
          />
          {showMeasurements && room.area > 20 && (
            <Text
              x={points[0]}
              y={points[1]}
              text={`${room.area.toFixed(0)}m²`}
              fontSize={11}
              fill="#7f8c8d"
              fontStyle="bold"
            />
          )}
        </Group>
      );
    });
  };

  const renderRestrictedAreas = () => {
    return floorPlan.restrictedAreas.map((area: RestrictedArea) => {
      if (area.boundaries.length < 3) return null;

      const points = area.boundaries.flatMap(point => {
        const transformed = transformPoint(point.x, point.y);
        return [transformed.x, transformed.y];
      });

      // Professional restricted area styling
      const colors = {
        stairs: { fill: 'rgba(230, 126, 34, 0.7)', stroke: '#d35400' },
        elevator: { fill: 'rgba(155, 89, 182, 0.7)', stroke: '#8e44ad' },
        utility: { fill: 'rgba(52, 152, 219, 0.7)', stroke: '#2980b9' },
        mechanical: { fill: 'rgba(241, 196, 15, 0.7)', stroke: '#f39c12' }
      };

      const color = colors[area.type] || colors.utility;

      return (
        <Group key={area.id}>
          <Line
            points={points}
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth={2}
            closed={true}
            onClick={() => onElementClick?.(area.id, 'restricted')}
          />
          {/* Pattern overlay for restricted areas */}
          <Line
            points={points}
            fill={`url(#pattern-${area.type})`}
            stroke={color.stroke}
            strokeWidth={2}
            closed={true}
            opacity={0.3}
          />
          <Text
            x={points[0]}
            y={points[1]}
            text={area.type.toUpperCase()}
            fontSize={9}
            fill={color.stroke}
            fontWeight="bold"
          />
        </Group>
      );
    });
  };

  const renderEntrances = () => {
    return floorPlan.entrances.map((entrance: Entrance) => {
      const pos = transformPoint(entrance.position.x, entrance.position.y);
      const width = entrance.width * scale;

      // Professional entrance styling
      const colors = {
        main: { fill: '#27ae60', stroke: '#1e8449' },
        emergency: { fill: '#e74c3c', stroke: '#c0392b' },
        service: { fill: '#3498db', stroke: '#2980b9' }
      };

      const color = colors[entrance.type] || colors.main;

      return (
        <Group key={entrance.id}>
          {/* Entrance arc representing door swing */}
          <Path
            data={`M ${pos.x - width/2} ${pos.y} A ${width/2} ${width/2} 0 0 1 ${pos.x + width/2} ${pos.y}`}
            stroke={color.stroke}
            strokeWidth={3}
            fill="transparent"
          />
          {/* Entrance marker */}
          <Circle
            x={pos.x}
            y={pos.y}
            radius={4}
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth={2}
            onClick={() => onElementClick?.(entrance.id, 'entrance')}
          />
          <Text
            x={pos.x}
            y={pos.y - 15}
            text={entrance.type.charAt(0).toUpperCase()}
            fontSize={8}
            fill={color.stroke}
            align="center"
            fontWeight="bold"
          />
        </Group>
      );
    });
  };

  const renderIlots = () => {
    if (!showIlots) return null;

    return floorPlan.ilots.map((ilot: Ilot) => {
      const pos = transformPoint(ilot.position.x, ilot.position.y);
      const width = ilot.width * scale;
      const height = ilot.height * scale;

      // Advanced îlot styling based on type and stage
      let fillColor = 'rgba(155, 89, 182, 0.85)';
      let strokeColor = '#8e44ad';
      let shadowOffset = 2;
      
      if (stage === 'placed') {
        fillColor = 'rgba(46, 204, 113, 0.8)';
        strokeColor = '#27ae60';
      }

      // Type-based styling
      const typeStyles = {
        large: { fillColor: 'rgba(231, 76, 60, 0.8)', strokeColor: '#c0392b' },
        'medium-large': { fillColor: 'rgba(230, 126, 34, 0.8)', strokeColor: '#d35400' },
        medium: { fillColor: 'rgba(241, 196, 15, 0.8)', strokeColor: '#f39c12' },
        'small-medium': { fillColor: 'rgba(52, 152, 219, 0.8)', strokeColor: '#2980b9' },
        small: { fillColor: 'rgba(155, 89, 182, 0.8)', strokeColor: '#8e44ad' },
        micro: { fillColor: 'rgba(149, 165, 166, 0.8)', strokeColor: '#7f8c8d' },
        fill: { fillColor: 'rgba(39, 174, 96, 0.6)', strokeColor: '#27ae60' }
      };

      if (typeStyles[ilot.type as keyof typeof typeStyles]) {
        const style = typeStyles[ilot.type as keyof typeof typeStyles];
        fillColor = style.fillColor;
        strokeColor = style.strokeColor;
      }

      return (
        <Group key={ilot.id}>
          {/* Îlot shadow for 3D effect */}
          <Rect
            x={pos.x - width / 2 + shadowOffset}
            y={pos.y - height / 2 + shadowOffset}
            width={width}
            height={height}
            fill="rgba(0, 0, 0, 0.15)"
            cornerRadius={6}
          />
          {/* Main îlot body */}
          <Rect
            x={pos.x - width / 2}
            y={pos.y - height / 2}
            width={width}
            height={height}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2.5}
            cornerRadius={6}
            onClick={() => onElementClick?.(ilot.id, 'ilot')}
          />
          {/* Îlot highlight */}
          <Rect
            x={pos.x - width / 2 + 2}
            y={pos.y - height / 2 + 2}
            width={width - 4}
            height={height - 4}
            fill="rgba(255, 255, 255, 0.2)"
            cornerRadius={4}
          />
          {/* Measurements and labels */}
          {showMeasurements && width > 20 && (
            <Group>
              <Text
                x={pos.x}
                y={pos.y - 5}
                text={`${ilot.area.toFixed(1)}m²`}
                fontSize={10}
                fill="#2c3e50"
                align="center"
                fontWeight="bold"
              />
              <Text
                x={pos.x}
                y={pos.y + 5}
                text={ilot.type.toUpperCase()}
                fontSize={8}
                fill="#34495e"
                align="center"
                fontStyle="italic"
              />
            </Group>
          )}
        </Group>
      );
    });
  };

  const renderCorridors = () => {
    if (!showCorridors) return null;

    return floorPlan.corridors.map((corridor: Corridor) => {
      const points = corridor.path.flatMap(point => {
        const transformed = transformPoint(point.x, point.y);
        return [transformed.x, transformed.y];
      });

      const corridorWidth = corridor.width * scale;

      return (
        <Group key={corridor.id}>
          {/* Corridor shadow */}
          <Line
            points={points.map((p, i) => i % 2 === 0 ? p + 1 : p + 1)}
            stroke="rgba(0, 0, 0, 0.1)"
            strokeWidth={corridorWidth + 2}
            lineCap="round"
            lineJoin="round"
          />
          {/* Main corridor */}
          <Line
            points={points}
            stroke="rgba(52, 152, 219, 0.7)"
            strokeWidth={corridorWidth}
            lineCap="round"
            lineJoin="round"
            onClick={() => onElementClick?.(corridor.id, 'corridor')}
          />
          {/* Corridor centerline */}
          <Line
            points={points}
            stroke="rgba(255, 255, 255, 0.8)"
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
            dash={[8, 4]}
          />
          {showMeasurements && (
            <Text
              x={points[0]}
              y={points[1] - 10}
              text={`${corridor.width}m wide`}
              fontSize={9}
              fill="#2980b9"
              fontWeight="bold"
            />
          )}
        </Group>
      );
    });
  };

  const renderGrid = () => {
    if (stage === 'empty') return null;

    const gridLines = [];
    const gridSpacing = 50; // 5m grid in real world
    const gridSize = gridSpacing * scale;

    // Vertical grid lines
    for (let x = offsetX % gridSize; x < canvasWidth; x += gridSize) {
      gridLines.push(
        <Line
          key={`vgrid-${x}`}
          points={[x, 0, x, canvasHeight]}
          stroke="rgba(149, 165, 166, 0.2)"
          strokeWidth={0.5}
        />
      );
    }

    // Horizontal grid lines
    for (let y = offsetY % gridSize; y < canvasHeight; y += gridSize) {
      gridLines.push(
        <Line
          key={`hgrid-${y}`}
          points={[0, y, canvasWidth, y]}
          stroke="rgba(149, 165, 166, 0.2)"
          strokeWidth={0.5}
        />
      );
    }

    return gridLines;
  };

  const renderLegend = () => {
    const legendItems = [];
    let yOffset = 20;

    // Stage indicator
    legendItems.push(
      <Group key="stage-indicator">
        <Rect
          x={canvasWidth - 180}
          y={10}
          width={160}
          height={30}
          fill="rgba(255, 255, 255, 0.9)"
          stroke="#bdc3c7"
          strokeWidth={1}
          cornerRadius={4}
        />
        <Text
          x={canvasWidth - 100}
          y={20}
          text={`Stage: ${stage.toUpperCase()}`}
          fontSize={12}
          fill="#2c3e50"
          align="center"
          fontWeight="bold"
        />
      </Group>
    );

    // Utilization display
    if (showIlots && floorPlan.ilots.length > 0) {
      const totalIlotArea = floorPlan.ilots.reduce((sum, ilot) => sum + ilot.area, 0);
      const utilization = ((totalIlotArea / floorPlan.availableArea) * 100).toFixed(1);
      
      legendItems.push(
        <Group key="utilization">
          <Rect
            x={canvasWidth - 180}
            y={50}
            width={160}
            height={25}
            fill="rgba(46, 204, 113, 0.1)"
            stroke="#27ae60"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text
            x={canvasWidth - 100}
            y={58}
            text={`Utilization: ${utilization}%`}
            fontSize={11}
            fill="#27ae60"
            align="center"
            fontWeight="bold"
          />
        </Group>
      );
    }

    return legendItems;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Stage width={canvasWidth} height={canvasHeight} ref={stageRef}>
        <Layer>
          {/* Professional canvas background */}
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
          />
          
          {/* Grid overlay */}
          {renderGrid()}
          
          {/* Floor plan elements */}
          {renderRooms()}
          {renderRestrictedAreas()}
          {renderWalls()}
          {renderEntrances()}
          {renderCorridors()}
          {renderIlots()}
          
          {/* Professional legend and info */}
          {renderLegend()}
        </Layer>
      </Stage>
      
      {/* Precision scale indicator */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <div className="w-12 h-0.5 bg-slate-800"></div>
          <span className="font-mono">{(50 / scale).toFixed(1)}m</span>
        </div>
      </div>
      
      {/* Stage-specific status indicator */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            stage === 'parsed' ? 'bg-red-500' :
            stage === 'processed' ? 'bg-green-500' :
            stage === 'placed' ? 'bg-blue-500' :
            stage === 'corridors' ? 'bg-purple-500' :
            'bg-gray-400'
          }`}></div>
          <span className="text-sm font-medium text-slate-700">
            {stage === 'parsed' ? 'Raw CAD Data' :
             stage === 'processed' ? 'Processed Plan' :
             stage === 'placed' ? 'Îlots Placed' :
             stage === 'corridors' ? 'Complete Layout' :
             'Empty Canvas'}
          </span>
        </div>
      </div>
    </div>
  );
};
