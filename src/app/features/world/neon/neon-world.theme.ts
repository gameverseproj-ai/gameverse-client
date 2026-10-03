import { WorldTheme } from '../../../shared/world/world-theme.model';

export const NEON_WORLD_THEME: WorldTheme = {
  id: 'neon', worldId: 'neon-city', clearColor: 0x101c35,
  fogColor: 0x293e59, fogDensity: .0045,
  sky: { top: 0x070e21, middle: 0x172745, bottom: 0x254964, haze: 0x3d6779, clouds: false },
  ambientLight: { color: 0xd5e7ff, intensity: .85 },
  hemisphereLight: { skyColor: 0xb8dcff, groundColor: 0x52647b, intensity: 1.8 },
  directionalLight: { color: 0xe4f2ff, intensity: 2.6, position: [15, 35, 18] },
  accentLights: [
    { color: 0x31eaff, intensity: 12, distance: 32, position: [-8, 6, -10] },
    { color: 0xeb40ff, intensity: 12, distance: 32, position: [8, 6, -20] },
  ],
  ground: { color: 0x26394c, roughness: .7, size: 200, gridDivisions: 50,
    gridColor1: 0x308b9c, gridColor2: 0x3d536e, gridOpacity: .12 },
  spawnRingColor: 0x49efff,
};
