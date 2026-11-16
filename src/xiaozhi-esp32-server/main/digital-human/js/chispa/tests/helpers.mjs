import { readFileSync } from 'node:fs';
export const catalog = JSON.parse(readFileSync(new URL('../config/expressions.json', import.meta.url), 'utf8'));
// rng determinista para pruebas
export function seeded(seed = 7) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296); }
