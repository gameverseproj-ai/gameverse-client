export interface WorldThemeLight {
  readonly color: number;
  readonly intensity: number;
}

export interface WorldThemeAccentLight {
  readonly color: number;
  readonly intensity: number;
  readonly distance: number;
  readonly position: [number, number, number];
}

export interface WorldThemeGround {
  readonly color: number;
  readonly roughness: number;
  readonly size: number;
  readonly gridDivisions: number;
  readonly gridColor1: number;
  readonly gridColor2: number;
}

export interface WorldTheme {
  readonly id: string;
  readonly worldId: string;
  readonly clearColor: number;
  readonly fogColor: number;
  readonly fogDensity: number;
  readonly ambientLight: WorldThemeLight;
  readonly directionalLight: WorldThemeLight & { readonly position: [number, number, number] };
  readonly accentLights: readonly WorldThemeAccentLight[];
  readonly ground: WorldThemeGround;
  readonly spawnRingColor: number;
}
