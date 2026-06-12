import { WorldTheme } from '../../../shared/world/world-theme.model';

export const GELLY_WORLD_THEME: WorldTheme = {
  id: 'gelly',
  worldId: 'gelly',
  clearColor: 0x0d0d1a,
  fogColor: 0x0d0d1a,
  fogDensity: 0.016,
  ambientLight: { color: 0xffffff, intensity: 2.5 },
  directionalLight: { color: 0xffffff, intensity: 3, position: [15, 30, 10] },
  accentLights: [
    { color: 0x7c3aed, intensity: 5, distance: 80, position: [-20, 12, 5] },
    { color: 0x06b6d4, intensity: 4, distance: 80, position: [20, 8, -5] },
  ],
  ground: {
    color: 0x1a2040,
    roughness: 0.9,
    size: 140,
    gridDivisions: 56,
    gridColor1: 0x4040a0,
    gridColor2: 0x2a2a70,
  },
  spawnRingColor: 0x9d5cff,
};
