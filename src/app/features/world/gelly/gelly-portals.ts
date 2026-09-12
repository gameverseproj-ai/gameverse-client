import * as THREE from 'three';
import { GamePortal } from '../../../shared/world/game-portal.model';
import { batchHall, buildFactory, buildGym, buildSnakeHall, buildTemple } from './gelly-halls';

function hall(id: string, name: string, build: () => THREE.Group,
  position: [number, number, number], scale: [number, number, number], color: number): GamePortal {
  return {
    id, name, route: `/games/${id}`, position, scale, color,
    buildLabel(el) { el.textContent = name; },
    buildGroup() { const group = build(); batchHall(group); return group; },
  };
}

export const GELLY_PORTALS: GamePortal[] = [
  hall('snake', 'Snake Hall', buildSnakeHall, [-20, 0, -18], [10, 12.5, 9], 0x75ef54),
  hall('2048', '2048 Temple', buildTemple, [-7, 0, -33], [12, 13.3, 8.5], 0xffc34d),
  hall('tetris', 'Tetris Factory', buildFactory, [10, 0, -31], [11, 15, 7.5], 0xe775ff),
  hall('power', 'Power Gym', buildGym, [24, 0, -17], [14, 12.2, 7.2], 0xff743d),
];
