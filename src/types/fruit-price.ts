export type Row = Record<string, string>;

export interface MarketCache {
  rows: Row[];
  totalCount: number;
  fetchedAt: number;
}

export interface TradeStore {
  cache: Record<string, MarketCache>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;

  fetchMarket: (marketCode: string, date?: string) => Promise<void>;
  fetchByMiddle: (middleName: string, date?: string, marketCode?: string) => Promise<void>;
  invalidate: (cacheKey: string) => void;
  getRows: (cacheKey: string) => Row[];
}
