The code has been updated to enhance the visual rendering of the floor plan, including wall styles, room styles, entrance styles, legend, and canvas background.
```

```replit_final_file
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
    if (!floorPlan?.walls) return null;

    return floorPlan.walls.map((wall) => {
      const key = `wall-${wall.id}`;

      // Professional wall styling based on type
      const getWallStyle = (wallType: string) => {
        switch (wallType) {
          case 'exterior':
            return { stroke: '#2c3e50', strokeWidth: 6 };
          case 'load-bearing':
            return { stroke: '#34495e', strokeWidth: 4 };
          default:
            return { stroke: '#5d6d7e', strokeWidth: 3 };
        }
      };

      const style = getWallStyle(wall.type);

      return (
        <Line
          key={key}
          points={[
            (wall.start.x - floorPlan.bounds.minX) * scale + 50,
            (wall.start.y - floorPlan.bounds.minY) * scale + 50,
            (wall.end.x - floorPlan.bounds.minX) * scale + 50,
            (wall.end.y - floorPlan.bounds.minY) * scale + 50,
          ]}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          lineCap="round"
          lineJoin="round"
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
    if (!floorPlan?.entrances) return null;

    return floorPlan.entrances.map((entrance) => {
      const centerX = (entrance.position.x - floorPlan.bounds.minX) * scale + 50;
      const centerY = (entrance.position.y - floorPlan.bounds.minY) * scale + 50;
      const radius = (entrance.width * scale) / 2;

      // Professional entrance styling
      const getEntranceColor = (entranceType: string) => {
        switch (entranceType) {
          case 'main':
            return { fill: 'rgba(231, 76, 60, 0.3)', stroke: '#e74c3c' };
          case 'emergency':
            return { fill: 'rgba(230, 126, 34, 0.3)', stroke: '#e67e22' };
          default:
            return { fill: 'rgba(231, 76, 60, 0.2)', stroke: '#c0392b' };
        }
      };

      const colors = getEntranceColor(entrance.type);

      return (
        <Group key={`entrance-${entrance.id}`}>
          {/* Door swing arc */}
          <Circle
            x={centerX}
            y={centerY}
            radius={radius}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={2}
            onClick={() => onElementClick?.(entrance.id, 'entrance')}
          />

          {/* Door opening line */}
          <Line
            points={[
              centerX - radius,
              centerY,
              centerX + radius,
              centerY
            ]}
            stroke={colors.stroke}
            strokeWidth={3}
            lineCap="round"
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
    if (!floorPlan?.rooms) return null;

    return floorPlan.rooms.map((room) => {
      if (room.boundaries.length < 3) return null;

      const points = room.boundaries.flatMap(point => [
        (point.x - floorPlan.bounds.minX) * scale + 50,
        (point.y - floorPlan.bounds.minY) * scale + 50,
      ]);

      // Professional room styling
      const getRoomStyle = (roomType: string) => {
        switch (roomType) {
          case 'available':
            return { 
              fill: 'rgba(236, 240, 244, 0.8)', 
              stroke: 'transparent', 
              strokeWidth: 0 
            };
          case 'restricted':
            return { 
              fill: 'rgba(231, 76, 60, 0.2)', 
              stroke: '#e74c3c', 
              strokeWidth: 1 
            };
          default:
            return { 
              fill: 'rgba(236, 240, 244, 0.6)', 
              stroke: 'transparent', 
              strokeWidth: 0 
            };
        }
      };

      const style = getRoomStyle(room.type);

      return (
        <Line
          key={`room-${room.id}`}
          points={points}
          closed={true}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          onClick={() => onElementClick?.(room.id, 'room')}
        />
      );
    });
  };

  const renderLegend = () => (
    <Group x={dimensions.width - 220} y={20}>
      <Rect
        width={200}
        height={160}
        fill="rgba(255, 255, 255, 0.98)"
        stroke="#bdc3c7"
        strokeWidth={1}
        cornerRadius={12}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={8}
        shadowOffset={{ x: 2, y: 2 }}
      />

      {/* Header */}
      <Rect
        x={0}
        y={0}
        width={200}
        height={35}
        fill="rgba(52, 73, 94, 0.95)"
        cornerRadius={12}
      />
      <Text text="LÉGENDE" x={15} y={12} fontSize={14} fontStyle="bold" fill="white" />

      {/* Walls - MUR */}
      <Line points={[15, 55, 45, 55]} stroke="#2c3e50" strokeWidth={4} lineCap="round" />
      <Text text="MUR" x={55} y={48} fontSize={13} fontFamily="Arial" fill="#2c3e50" fontStyle="bold" />

      {/* No Entry Areas */}
      <Rect x={15} y={70} width={25} height={15} fill="#5DADE2" stroke="transparent" cornerRadius={2} />
      <Text text="NO ENTRÉE" x={55} y={74} fontSize={13} fontFamily="Arial" fill="#2980b9" fontStyle="bold" />

      {/* Entrances - ENTRÉE/SORTIE */}
      <Circle x={27} y={105} radius={10} fill="rgba(231, 76, 60, 0.4)" stroke="#e74c3c" strokeWidth={2} />
      <Line points={[17, 105, 37, 105]} stroke="#e74c3c" strokeWidth={3} lineCap="round" />
      <Text text="ENTRÉE/SORTIE" x={55} y={99} fontSize={13} fontFamily="Arial" fill="#c0392b" fontStyle="bold" />

      {showIlots && (
        <>
          <Rect x={15} y={125} width={18} height={18} fill="rgba(155, 89, 182, 0.8)" stroke="#8e44ad" strokeWidth={2} cornerRadius={3} />
          <Text text="ÎLOTS" x={55} y={129} fontSize={13} fontFamily="Arial" fill="#7d3c98" fontStyle="bold" />
        </>
      )}

      {showCorridors && (
        <>
          <Line points={[15, 150, 45, 150]} stroke="#f39c12" strokeWidth={6} lineCap="round" />
          <Text text="CORRIDORS" x={55} y={144} fontSize={13} fontFamily="Arial" fill="#d68910" fontStyle="bold" />
        </>
      )}
    </Group>
  );

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
```The code has been updated to enhance the visual rendering of the floor plan, including wall styles, room styles, entrance styles, legend, and canvas background.
```

```replit_final_file
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
  const padding = 50;
  const canvasWidth = 800;
  const canvasHeight = 600;


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
    if (!floorPlan?.walls) return null;

    return floorPlan.walls.map((wall) => {
      const key = `wall-${wall.id}`;

      // Professional wall styling based on type
      const getWallStyle = (wallType: string) => {
        switch (wallType) {
          case 'exterior':
            return { stroke: '#2c3e50', strokeWidth: 6 };
          case 'load-bearing':
            return { stroke: '#34495e', strokeWidth: 4 };
          default:
            return { stroke: '#5d6d7e', strokeWidth: 3 };
        }
      };

      const style = getWallStyle(wall.type);

      return (
        <Line
          key={key}
          points={[
            (wall.start.x - floorPlan.bounds.minX) * scale + padding,
            (wall.start.y - floorPlan.bounds.minY) * scale + padding,
            (wall.end.x - floorPlan.bounds.minX) * scale + padding,
            (wall.end.y - floorPlan.bounds.minY) * scale + padding,
          ]}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          lineCap="round"
          lineJoin="round"
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
    if (!floorPlan?.entrances) return null;

    return floorPlan.entrances.map((entrance) => {
      const centerX = (entrance.position.x - floorPlan.bounds.minX) * scale + padding;
      const centerY = (entrance.position.y - floorPlan.bounds.minY) * scale + padding;
      const radius = (entrance.width * scale) / 2;

      // Professional entrance styling
      const getEntranceColor = (entranceType: string) => {
        switch (entranceType) {
          case 'main':
            return { fill: 'rgba(231, 76, 60, 0.3)', stroke: '#e74c3c' };
          case 'emergency':
            return { fill: 'rgba(230, 126, 34, 0.3)', stroke: '#e67e22' };
          default:
            return { fill: 'rgba(231, 76, 60, 0.2)', stroke: '#c0392b' };
        }
      };

      const colors = getEntranceColor(entrance.type);

      return (
        <Group key={`entrance-${entrance.id}`}>
          {/* Door swing arc */}
          <Circle
            x={centerX}
            y={centerY}
            radius={radius}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={2}
            onClick={() => onElementClick?.(entrance.id, 'entrance')}
          />

          {/* Door opening line */}
          <Line
            points={[
              centerX - radius,
              centerY,
              centerX + radius,
              centerY
            ]}
            stroke={colors.stroke}
            strokeWidth={3}
            lineCap="round"
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
    if (!floorPlan?.rooms) return null;

    return floorPlan.rooms.map((room) => {
      if (room.boundaries.length < 3) return null;

      const points = room.boundaries.flatMap(point => [
        (point.x - floorPlan.bounds.minX) * scale + padding,
        (point.y - floorPlan.bounds.minY) * scale + padding,
      ]);

      // Professional room styling
      const getRoomStyle = (roomType: string) => {
        switch (roomType) {
          case 'available':
            return { 
              fill: 'rgba(236, 240, 244, 0.8)', 
              stroke: 'transparent', 
              strokeWidth: 0 
            };
          case 'restricted':
            return { 
              fill: 'rgba(231, 76, 60, 0.2)', 
              stroke: '#e74c3c', 
              strokeWidth: 1 
            };
          default:
            return { 
              fill: 'rgba(236, 240, 244, 0.6)', 
              stroke: 'transparent', 
              strokeWidth: 0 
            };
        }
      };

      const style = getRoomStyle(room.type);

      return (
        <Line
          key={`room-${room.id}`}
          points={points}
          closed={true}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          onClick={() => onElementClick?.(room.id, 'room')}
        />
      );
    });
  };

  const renderLegend = () => (
    <Group x={dimensions.width - 220} y={20}>
      <Rect
        width={200}
        height={160}
        fill="rgba(255, 255, 255, 0.98)"
        stroke="#bdc3c7"
        strokeWidth={1}
        cornerRadius={12}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={8}
        shadowOffset={{ x: 2, y: 2 }}
      />

      {/* Header */}
      <Rect
        x={0}
        y={0}
        width={200}
        height={35}
        fill="rgba(52, 73, 94, 0.95)"
        cornerRadius={12}
      />
      <Text text="LÉGENDE" x={15} y={12} fontSize={14} fontStyle="bold" fill="white" />

      {/* Walls - MUR */}
      <Line points={[15, 55, 45, 55]} stroke="#2c3e50" strokeWidth={4} lineCap="round" />
      <Text text="MUR" x={55} y={48} fontSize={13} fontFamily="Arial" fill="#2c3e50" fontStyle="bold" />

      {/* No Entry Areas */}
      <Rect x={15} y={70} width={25} height={15} fill="#5DADE2" stroke="transparent" cornerRadius={2} />
      <Text text="NO ENTRÉE" x={55} y={74} fontSize={13} fontFamily="Arial" fill="#2980b9" fontStyle="bold" />

      {/* Entrances - ENTRÉE/SORTIE */}
      <Circle x={27} y={105} radius={10} fill="rgba(231, 76, 60, 0.4)" stroke="#e74c3c" strokeWidth={2} />
      <Line points={[17, 105, 37, 105]} stroke="#e74c3c" strokeWidth={3} lineCap="round" />
      <Text text="ENTRÉE/SORTIE" x={55} y={99} fontSize={13} fontFamily="Arial" fill="#c0392b" fontStyle="bold" />

      {showIlots && (
        <>
          <Rect x={15} y={125} width={18} height={18} fill="rgba(155, 89, 182, 0.8)" stroke="#8e44ad" strokeWidth={2} cornerRadius={3} />
          <Text text="ÎLOTS" x={55} y={129} fontSize={13} fontFamily="Arial" fill="#7d3c98" fontStyle="bold" />
        </>
      )}

      {showCorridors && (
        <>
          <Line points={[15, 150, 45, 150]} stroke="#f39c12" strokeWidth={6} lineCap="round" />
          <Text text="CORRIDORS" x={55} y={144} fontSize={13} fontFamily="Arial" fill="#d68910" fontStyle="bold" />
        </>
      )}
    </Group>
  );

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
      {/* Professional grid background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

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

      {/* Professional compass/scale indicator */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-slate-200">
        <div className="flex items-center space-x-3 text-sm text-slate-600">
          <div className="flex items-center space-x-1">
            <div className="w-8 h-0.5 bg-slate-400"></div>
            <span className="font-medium">1m</span>
          </div>
          <div className="text-xs opacity-60">Scale: 1:{floorPlan?.scale || 1}</div>
        </div>
      </div>
    </div>
  );
};