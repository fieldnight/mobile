import { LARGE_CATEGORY } from "@/constants";
import type { Row } from "@/types";

type Option = { code: string; name: string };
export const QUICK_MIDDLE_PREFIX = "__quick_middle__:";

const FEATURED_MIDDLE_OPTIONS: Record<string, Option[]> = {
  "06": ["사과", "배", "포도"].map((name) => ({
    code: `${QUICK_MIDDLE_PREFIX}${name}`,
    name,
  })),
  "08": ["딸기", "토마토"].map((name) => ({
    code: `${QUICK_MIDDLE_PREFIX}${name}`,
    name,
  })),
};

function uniqueBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function getLargeOptions(rows: Row[]): Option[] {
  return uniqueBy(
    [
      ...Object.keys(FEATURED_MIDDLE_OPTIONS).map((code) => ({
        code,
        name: LARGE_CATEGORY[code] ?? `기타(${code})`,
      })),
      ...rows
        .filter((r) => r.gds_lclsf_cd)
        .map((r) => ({
          code: r.gds_lclsf_cd,
          name: LARGE_CATEGORY[r.gds_lclsf_cd] ?? `기타(${r.gds_lclsf_cd})`,
        })),
    ],
    (o) => o.code,
  );
}

export function getMiddleOptions(rows: Row[], largeCode = ""): Option[] {
  return uniqueBy(
    [
      ...rows
        .filter(
          (r) =>
            r.gds_mclsf_cd &&
            r.gds_mclsf_nm &&
            (!largeCode || r.gds_lclsf_cd === largeCode),
        )
        .map((r) => ({ code: r.gds_mclsf_cd, name: r.gds_mclsf_nm })),
      ...(FEATURED_MIDDLE_OPTIONS[largeCode] ?? []),
    ],
    (o) => o.name,
  );
}

export function getSmallOptions(
  rows: Row[],
  middleCode = "",
  middleName = "",
): Option[] {
  return uniqueBy(
    rows
      .filter(
        (r) =>
          r.gds_sclsf_cd &&
          r.gds_sclsf_nm &&
          (!middleCode ||
            r.gds_mclsf_cd === middleCode ||
            (!!middleName && r.gds_mclsf_nm === middleName)),
      )
      .map((r) => ({ code: r.gds_sclsf_cd, name: r.gds_sclsf_nm })),
    (o) => o.code,
  );
}

export function getQuickMiddleName(code?: string | null) {
  return typeof code === "string" && code.startsWith(QUICK_MIDDLE_PREFIX)
    ? code.replace(QUICK_MIDDLE_PREFIX, "")
    : "";
}
