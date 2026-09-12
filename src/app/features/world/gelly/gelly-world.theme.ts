import { WorldTheme } from '../../../shared/world/world-theme.model';

export const GELLY_WORLD_THEME: WorldTheme = {
  id: 'gelly',
  worldId: 'gelly',
  clearColor: 0x7A5CFF,           // Mid-sky violet — sky dome covers it
  fogColor: 0xBDA8FF,             // Soft lavender haze — Art Bible
  fogDensity: 0.005,              // Very subtle — preserves background depth
  ambientLight:  { color: 0xe8d8ff, intensity: .65 },
  hemisphereLight: { skyColor: 0x7A5CFF, groundColor: 0x6B68BB, intensity: 1.25 },
  directionalLight: { color: 0xfff4e8, intensity: 2.2, position: [20, 40, 15] },
  accentLights: [
    // Portal accent lights positioned at building locations — Art Bible colors
    { color: 0x57FF8A, intensity: 5.5, distance: 120, position: [-20, 14, -12] },
    { color: 0xFF6BFF, intensity: 5.5, distance: 120, position: [ 20, 14, -12] },
    { color: 0xFFD65C, intensity: 5.0, distance: 110, position: [  0, 20, -35] },
  ],
  ground: {
    color: 0x4B4A8F,              // Art Bible: #4B4A8F — never near-black
    roughness: 0.75,
    emissive: 0x3a3880,
    emissiveIntensity: 0.12,
    size: 200,
    gridDivisions: 40,
    gridColor1: 0x5856a8,
    gridColor2: 0x4B4A8F,
  },
  spawnRingColor: 0xFF6BFF,
};
