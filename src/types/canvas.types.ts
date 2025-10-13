// Canvas types - to be implemented in PR #3
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Transform {
  scale: number;
  position: Position;
}

export interface CanvasObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  createdBy: string;
  timestamp: number;
}

export interface Rectangle extends CanvasObject {
  type: "rectangle";
}
