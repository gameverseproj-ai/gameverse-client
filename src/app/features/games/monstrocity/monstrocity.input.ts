/** Rotate screen input into world axes without exceeding the API's [-1, 1] range. */
export function worldInput(x: number, y: number) {
    const scale = Math.max(1, Math.hypot(x, y)) * Math.hypot(.785, .62);
    const bound = (value: number) => Math.max(-1, Math.min(1, value / scale));
    return { moveX: bound(x * .785 + y * .62), moveZ: bound(-x * .62 + y * .785) };
}
