/** Solid ground footprint in world coordinates. */
export interface WorldObstacle {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}
