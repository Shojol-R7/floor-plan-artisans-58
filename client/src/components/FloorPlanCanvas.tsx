import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text, Group } from 'react-konva';
import { FloorPlan, Ilot, Corridor, Wall, RestrictedArea, Entrance } from '@/types/floorplan';

interface FloorPlanCanvasProps {
  floorPlan: FloorPlan;
  showIlots?: boolean;
  showCorridors?: boolean;
  showMeasurements?: boolean;
  stage: 'empty' | 'placed' | 'corridors';
  onElementClick?: (elementId: string, elementType: string) => void;
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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(20); // Default scale for better visibility
  const [offset, setOffset] = useState({ x: 50, y: 50 }); // Default offset

  console.log('FloorPlanCanvas render - floorPlan exists:', !!floorPlan, 'stage:', stage);

  useEffect(() => {
    if (floorPlan && floorPlan.bounds) {
      console.log('Calculating optimal view for floor plan:', floorPlan.name);
      calculateOptimalView();
    }
  }, [floorPlan]);

  const calculateOptimalView = () => {
    if (!floorPlan || !floorPlan.bounds) return;
    
    const bounds = floorPlan.bounds;
    const padding = 50;
    const canvasWidth = 800;
    const canvasHeight = 600;
    
    const planWidth = bounds.maxX - bounds.minX;
    const planHeight = bounds.maxY - bounds.minY;
    
    // Ensure we have valid dimensions
    if (planWidth <= 0 || planHeight <= 0) return;
    
    const scaleX = (canvasWidth - 2 * padding) / planWidth;
    const scaleY = (canvasHeight - 2 * padding) / planHeight;
    const optimalScale = Math.min(scaleX, scaleY, 50); // Cap at 50 for readability
    
    setScale(optimalScale);
    setOffset({
      x: (canvasWidth - planWidth * optimalScale) / 2 - bounds.minX * optimalScale,
      y: (canvasHeight - planHeight * optimalScale) / 2 - bounds.minY * optimalScale
    });
    
    console.log('Set scale:', optimalScale, 'offset:', {
      x: (canvasWidth - planWidth * optimalScale) / 2 - bounds.minX * optimalScale,
      y: (canvasHeight - planHeight * optimalScale) / 2 - bounds.minY * optimalScale
    });
  };

  const transformPoint = (x: number, y: number) => ({
    x: x * scale + offset.x,
    y: y * scale + offset.y
  });

  const renderWalls = () => {
    console.log('Rendering walls:', floorPlan.walls.length);
    return floorPlan.walls.map((wall: Wall) => {
      const start = transformPoint(wall.start.x, wall.start.y);
      const end = transformPoint(wall.end.x, wall.end.y);
      
      console.log(`Rendering wall ${wall.id} from (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);
      
      return (
        <Line
          key={wall.id}
          points={[start.x, start.y, end.x, end.y]}
          stroke="#6B7280" // CSS: text-wall
          strokeWidth={Math.max(wall.thickness * scale * 10, 2)} // Ensure minimum visibility
          lineCap="round"
          onClick={() => onElementClick?.(wall.id, 'wall')}
        />
      );
    });
  };

  const renderRestrictedAreas = () => {
    return floorPlan.restrictedAreas.map((area: RestrictedArea) => {
      const points = area.boundaries.flatMap(point => {
        const transformed = transformPoint(point.x, point.y);
        return [transformed.x, transformed.y];
      });
      
      return (
        <Group key={area.id}>
          <Line
            points={points}
            fill="#3B82F6" // CSS: bg-restricted
            fillOpacity={0.3}
            stroke="#3B82F6"
            strokeWidth={2}
            closed={true}
            onClick={() => onElementClick?.(area.id, 'restricted')}
          />
          {showMeasurements && (
            <Text
              x={transformPoint(
                area.boundaries.reduce((sum, p) => sum + p.x, 0) / area.boundaries.length,
                area.boundaries.reduce((sum, p) => sum + p.y, 0) / area.boundaries.length
              ).x}
              y={transformPoint(
                area.boundaries.reduce((sum, p) => sum + p.x, 0) / area.boundaries.length,
                area.boundaries.reduce((sum, p) => sum + p.y, 0) / area.boundaries.length
              ).y}
              text={`NO ENTRÉE\n${area.area.toFixed(1)}m²`}
              fontSize={10}
              fill="#FFFFFF"
              align="center"
            />
          )}
        </Group>
      );
    });
  };

  const renderEntrances = () => {
    return floorPlan.entrances.map((entrance: Entrance) => {
      const pos = transformPoint(entrance.position.x, entrance.position.y);
      const width = entrance.width * scale;
      
      return (
        <Group key={entrance.id}>
          {/* Entrance area */}
          <Rect
            x={pos.x - width / 2}
            y={pos.y - 10}
            width={width}
            height={20}
            fill="#EF4444" // CSS: bg-entrance
            fillOpacity={0.6}
            stroke="#EF4444"
            strokeWidth={2}
            onClick={() => onElementClick?.(entrance.id, 'entrance')}
          />
          
          {/* Door swing arc */}
          <Circle
            x={pos.x}
            y={pos.y}
            radius={width / 2}
            stroke="#EF4444"
            strokeWidth={2}
            fill="transparent"
          />
          
          {showMeasurements && (
            <Text
              x={pos.x}
              y={pos.y + 25}
              text="ENTRÉE/SORTIE"
              fontSize={10}
              fill="#EF4444"
              align="center"
            />
          )}
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
      
      // Color based on stage
      const fillColor = stage === 'placed' ? '#84CC16' : '#FDE047'; // CSS: bg-ilot variations
      const strokeColor = '#65A30D';
      
      return (
        <Group key={ilot.id}>
          <Rect
            x={pos.x - width / 2}
            y={pos.y - height / 2}
            width={width}
            height={height}
            fill={fillColor}
            fillOpacity={0.7}
            stroke={strokeColor}
            strokeWidth={2}
            cornerRadius={4}
            onClick={() => onElementClick?.(ilot.id, 'ilot')}
          />
          
          {showMeasurements && (
            <Text
              x={pos.x}
              y={pos.y}
              text={`${ilot.area.toFixed(1)}m²`}
              fontSize={9}
              fill="#365314"
              align="center"
              fontWeight="bold"
            />
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
      
      return (
        <Group key={corridor.id}>
          <Line
            points={points}
            stroke="#F472B6" // CSS: text-corridor
            strokeWidth={corridor.width * scale}
            lineCap="round"
            lineJoin="round"
            onClick={() => onElementClick?.(corridor.id, 'corridor')}
          />
          
          {showMeasurements && corridor.path.length >= 2 && (
            <Text
              x={transformPoint(
                (corridor.path[0].x + corridor.path[corridor.path.length - 1].x) / 2,
                (corridor.path[0].y + corridor.path[corridor.path.length - 1].y) / 2
              ).x}
              y={transformPoint(
                (corridor.path[0].x + corridor.path[corridor.path.length - 1].x) / 2,
                (corridor.path[0].y + corridor.path[corridor.path.length - 1].y) / 2
              ).y}
              text={`${corridor.length.toFixed(1)}m`}
              fontSize={9}
              fill="#BE185D"
              align="center"
              fontWeight="bold"
            />
          )}
        </Group>
      );
    });
  };

  const renderRooms = () => {
    return floorPlan.rooms.map((room: Room) => {
      const points = room.boundaries.flatMap(point => {
        const transformed = transformPoint(point.x, point.y);
        return [transformed.x, transformed.y];
      });
      
      // Calculate center for room labels
      const centerX = room.boundaries.reduce((sum, p) => sum + p.x, 0) / room.boundaries.length;
      const centerY = room.boundaries.reduce((sum, p) => sum + p.y, 0) / room.boundaries.length;
      const center = transformPoint(centerX, centerY);
      
      return (
        <Group key={room.id}>
          <Line
            points={points}
            fill="#F8F9FA" // Light gray background for rooms
            fillOpacity={0.4}
            stroke="#E5E7EB"
            strokeWidth={1}
            closed={true}
            onClick={() => onElementClick?.(room.id, 'room')}
          />
          {showMeasurements && (
            <Text
              x={center.x}
              y={center.y - 8}
              text={room.name || `Room ${room.id}`}
              fontSize={10}
              fill="#374151"
              align="center"
              fontWeight="bold"
            />
          )}
          {showMeasurements && (
            <Text
              x={center.x}
              y={center.y + 6}
              text={`${room.area.toFixed(1)}m²`}
              fontSize={8}
              fill="#6B7280"
              align="center"
            />
          )}
        </Group>
      );
    });
  };

  const renderLegend = () => {
    if (stage === 'empty') return null;
    
    const legendItems = [
      { color: '#6B7280', label: 'MUR' },
      { color: '#3B82F6', label: 'NO ENTRÉE' },
      { color: '#EF4444', label: 'ENTRÉE/SORTIE' }
    ];
    
    if (showIlots) {
      legendItems.push({ color: '#84CC16', label: 'ÎLOTS' });
    }
    
    if (showCorridors) {
      legendItems.push({ color: '#F472B6', label: 'CORRIDORS' });
    }
    
    return (
      <Group>
        <Rect
          x={20}
          y={20}
          width={150}
          height={legendItems.length * 25 + 20}
          fill="white"
          stroke="#E5E7EB"
          strokeWidth={1}
          cornerRadius={8}
          shadowColor="black"
          shadowOpacity={0.1}
          shadowOffsetX={2}
          shadowOffsetY={2}
          shadowBlur={4}
        />
        
        {legendItems.map((item, index) => (
          <Group key={item.label}>
            <Rect
              x={30}
              y={35 + index * 25}
              width={15}
              height={15}
              fill={item.color}
              cornerRadius={2}
            />
            <Text
              x={50}
              y={37 + index * 25}
              text={item.label}
              fontSize={11}
              fill="#374151"
              fontWeight="600"
            />
          </Group>
        ))}
      </Group>
    );
  };

  return (
    <div className="w-full h-full bg-background rounded-lg border border-border overflow-hidden">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={true}
        onWheel={(e) => {
          e.evt.preventDefault();
          const scaleBy = 1.02;
          const stage = e.target.getStage();
          const oldScale = stage.scaleX();
          const pointer = stage.getPointerPosition();
          
          const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
          };
          
          const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
          
          stage.scale({ x: newScale, y: newScale });
          
          const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
          };
          
          stage.position(newPos);
          stage.batchDraw();
        }}
      >
        <Layer>
          {/* Debug info */}
          {floorPlan && (
            <Text
              x={10}
              y={10}
              text={`Floor Plan: ${floorPlan.name} | Walls: ${floorPlan.walls.length} | Scale: ${scale.toFixed(2)}`}
              fontSize={12}
              fill="#333"
            />
          )}
          
          {/* Render in correct z-order - rooms first, then restricted areas, walls, entrances, ilots, corridors */}
          {floorPlan && renderRooms()}
          {floorPlan && renderRestrictedAreas()}
          {floorPlan && renderWalls()}
          {floorPlan && renderEntrances()}
          {floorPlan && renderIlots()}
          {floorPlan && renderCorridors()}
          {renderLegend()}
        </Layer>
      </Stage>
    </div>
  );
};