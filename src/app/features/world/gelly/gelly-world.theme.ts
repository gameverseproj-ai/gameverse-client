import { WorldTheme } from '../../../shared/world/world-theme.model';

export const GELLY_WORLD_THEME: WorldTheme = {
  id: 'gelly',
  worldId: 'gelly',
  clearColor: 0x7A5CFF,           // Mid-sky violet — sky dome covers it
  fogColor: 0x8b73c1,             // Twilight haze from the v2 asset sheet
  fogDensity: 0.0035,              // Very subtle — preserves background depth
  ambientLight:  { color: 0xe8d8ff, intensity: .32 },
  hemisphereLight: { skyColor: 0xa5baff, groundColor: 0x4b365f, intensity: .85 },
  directionalLight: { color: 0xfff4e8, intensity: 2.8, position: [20, 40, 15] },
  accentLights: [
    // Portal accent lights positioned at building locations — Art Bible colors
    { color: 0x57FF8A, intensity: 5.5, distance: 120, position: [-20, 14, -12] },
    { color: 0xFF6BFF, intensity: 5.5, distance: 120, position: [ 20, 14, -12] },
    { color: 0xFFD65C, intensity: 5.0, distance: 110, position: [  0, 20, -35] },
  ],
  ground: {
    color: 0x34365f,              // Cool ground keeps the colored paths and gardens distinct
    roughness: 0.75,
    emissive: 0x252844,
    emissiveIntensity: 0.04,
    size: 200,
    gridDivisions: 40,
    gridColor1: 0x5856a8,
    gridColor2: 0x34365f,
  },
  spawnRingColor: 0xFF6BFF,
};
