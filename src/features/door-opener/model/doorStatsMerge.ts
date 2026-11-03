import type { BeeTrafficCounts, HceStatsBucket, HceStatsEvent } from "./webeeHce";

export interface DoorCounterState {
  bootCounts?: BeeTrafficCounts;
  counterSession?: string;
  counterLast?: BeeTrafficCounts;
}

const keys = ["entranceIn", "entranceOut", "exitIn", "exitOut"] as const;

/** Add only new passages; a BOOT snapshot is not a delta. Persist this state together. */
export function mergeDoorCounters(current: DoorCounterState, event: Extract<HceStatsEvent, { type: "boot" }>): DoorCounterState {
  const last = current.counterLast ?? current.bootCounts;
  const changedSession = !!event.sessionId && !!current.counterSession && event.sessionId !== current.counterSession;
  // Older firmware has no session ID. A decreasing counter is the only reset signal.
  const legacyReset = (!event.sessionId || !current.counterSession) && !!last && keys.some(key => event.counts[key] < last[key]);
  const total = { ...event.counts };
  if (current.bootCounts && last) {
    for (const key of keys) {
      total[key] = current.bootCounts[key] + (changedSession || legacyReset
        ? event.counts[key]
        : Math.max(0, event.counts[key] - last[key]));
    }
  }
  const highWater = { ...event.counts };
  if (last && !changedSession && !legacyReset) {
    for (const key of keys) highWater[key] = Math.max(last[key], event.counts[key]);
  }
  return { bootCounts: total, counterLast: highWater, counterSession: event.sessionId ?? current.counterSession };
}

export function mergeDoorBucket(current: HceStatsBucket | undefined, incoming: HceStatsBucket, sessionId?: string): HceStatsBucket {
  const merged = mergeDoorCounters({ ...current, bootCounts: current?.counts }, {
    raw: "", type: "boot", counts: incoming.counts, sessionId,
  });
  return { ...incoming, counts: merged.bootCounts!, counterLast: merged.counterLast, counterSession: merged.counterSession };
}
