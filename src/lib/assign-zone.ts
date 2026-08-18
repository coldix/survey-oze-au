export type DragMap = Record<string, string>;

export function assignToZone(value: DragMap, itemId: string, zone: string, unique: boolean): DragMap {
  const next: DragMap = { ...value };
  if (unique) {
    for (const [id, assigned] of Object.entries(next)) {
      if (assigned === zone) delete next[id];
    }
  }
  next[itemId] = zone;
  return next;
}

export function removeFromZone(value: DragMap, itemId: string): DragMap {
  const next = { ...value };
  delete next[itemId];
  return next;
}
