import { useMemo } from "react";
import {
  Layer,
  Rect as KonvaRect,
  Circle as KonvaCircle,
  Star as KonvaStar,
  Line as KonvaLine,
  Text as KonvaText,
} from "react-konva";
import type {
  RemoteTransformsMap,
  TransformSnapshot,
} from "../../types/collaboration.types";

interface RemoteTransformGhostsProps {
  remoteTransforms: RemoteTransformsMap;
  selfUserId: string | null;
}

/**
 * Renders semi-transparent ghost previews for other users' live transforms
 */
export default function RemoteTransformGhosts({
  remoteTransforms,
  selfUserId,
}: RemoteTransformGhostsProps) {
  const ghosts = useMemo(() => {
    const list: Array<{ userId: string; snapshot: TransformSnapshot }> = [];
    Object.entries(remoteTransforms).forEach(([userId, userSnaps]) => {
      if (selfUserId && userId === selfUserId) return; // hide self
      Object.values(userSnaps).forEach((snap) =>
        list.push({ userId, snapshot: snap })
      );
    });
    return list;
  }, [remoteTransforms, selfUserId]);

  if (ghosts.length === 0) return null;

  const renderGhost = (snap: TransformSnapshot) => {
    const common = {
      opacity: Math.min(0.3, snap.opacity ?? 1),
      rotation: snap.rotation ?? 0,
      listening: false,
    } as any;

    switch (snap.type) {
      case "rectangle":
        return (
          <KonvaRect
            key={`ghost-${snap.objectId}`}
            x={snap.x}
            y={snap.y}
            width={snap.width}
            height={snap.height}
            fill={snap.color || "#3B82F6"}
            stroke={snap.stroke}
            strokeWidth={snap.strokeWidth || 0}
            opacity={common.opacity}
            rotation={common.rotation}
            listening={false}
          />
        );
      case "circle": {
        const radius = Math.max(snap.width, snap.height) / 2;
        return (
          <KonvaCircle
            key={`ghost-${snap.objectId}`}
            x={snap.x + radius}
            y={snap.y + radius}
            radius={radius}
            fill={snap.color || "#3B82F6"}
            stroke={snap.stroke}
            strokeWidth={snap.strokeWidth || 0}
            opacity={common.opacity}
            rotation={common.rotation}
            listening={false}
          />
        );
      }
      case "star":
        return (
          <KonvaStar
            key={`ghost-${snap.objectId}`}
            x={snap.x + snap.width / 2}
            y={snap.y + snap.height / 2}
            numPoints={5}
            innerRadius={Math.min(snap.width, snap.height) * 0.25}
            outerRadius={Math.min(snap.width, snap.height) / 2}
            fill={snap.color || "#3B82F6"}
            stroke={snap.stroke}
            strokeWidth={snap.strokeWidth || 0}
            opacity={common.opacity}
            rotation={common.rotation}
            listening={false}
          />
        );
      case "line": {
        // Simple horizontal line fallback based on width; for accuracy we'd carry points
        return (
          <KonvaLine
            key={`ghost-${snap.objectId}`}
            x={snap.x}
            y={snap.y}
            points={[0, 0, Math.max(1, snap.width), 0]}
            stroke={snap.stroke || snap.color || "#000"}
            strokeWidth={snap.strokeWidth || 2}
            opacity={common.opacity}
            rotation={common.rotation}
            listening={false}
          />
        );
      }
      case "text":
        return (
          <KonvaText
            key={`ghost-${snap.objectId}`}
            x={snap.x}
            y={snap.y}
            width={snap.width}
            height={snap.height}
            text={snap.text || ""}
            fontFamily={snap.fontFamily || "Arial"}
            fontSize={snap.fontSize || 16}
            fontStyle={`${snap.fontStyle || "normal"} ${
              snap.fontWeight || "normal"
            }`}
            align={snap.textAlign || "left"}
            fill={snap.color || "#000"}
            opacity={common.opacity}
            rotation={common.rotation}
            listening={false}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layer listening={false}>
      {ghosts.map(({ snapshot }) => renderGhost(snapshot))}
    </Layer>
  );
}
