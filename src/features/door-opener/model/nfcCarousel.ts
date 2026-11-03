export interface LoopIndexResolution {
  logicalIndex: number;
  correctedLoopIndex: number;
}

/** 양끝에 복제 카드를 붙여 경계에서 끊김 없는 순환을 만듭니다. */
export function createLoopedItems<T>(items: readonly T[]) {
  if (items.length <= 1) return [...items];
  return [items[items.length - 1], ...items, items[0]];
}

export function toLoopIndex(logicalIndex: number, itemCount: number) {
  if (itemCount <= 1) return 0;
  return Math.min(Math.max(logicalIndex, 0), itemCount - 1) + 1;
}

/** 복제 카드에 도착하면 같은 실카드 위치로 즉시 이동할 인덱스를 함께 반환합니다. */
export function resolveLoopIndex(loopIndex: number, itemCount: number): LoopIndexResolution {
  if (itemCount <= 1) return { logicalIndex: 0, correctedLoopIndex: 0 };
  if (loopIndex <= 0) {
    return { logicalIndex: itemCount - 1, correctedLoopIndex: itemCount };
  }
  if (loopIndex >= itemCount + 1) {
    return { logicalIndex: 0, correctedLoopIndex: 1 };
  }
  return { logicalIndex: loopIndex - 1, correctedLoopIndex: loopIndex };
}
