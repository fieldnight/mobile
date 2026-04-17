import { LARGE_CATEGORY } from "@/constants";
import type { Row } from "@/types";

type Option = { code: string; name: string };

function uniqueBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// 대/중/소분류 옵션 파생 유틸 
export function getLargeOptions(rows: Row[]): Option[] {
  return uniqueBy(
    rows
      .filter((r) => r.gds_lclsf_cd)
      .map((r) => ({
        code: r.gds_lclsf_cd,
        name: LARGE_CATEGORY[r.gds_lclsf_cd] ?? `기타(${r.gds_lclsf_cd})`,
      })),
    (o) => o.code,
  );
}

export function getMiddleOptions(rows: Row[], largeCode: string): Option[] {
  return uniqueBy(
    rows
      .filter(
        (r) =>
          r.gds_mclsf_cd &&
          r.gds_mclsf_nm &&
          (!largeCode || r.gds_lclsf_cd === largeCode),
      )
      .map((r) => ({ code: r.gds_mclsf_cd, name: r.gds_mclsf_nm })),
    (o) => o.code,
  );
}

export function getSmallOptions(rows: Row[], middleCode: string): Option[] {
  return uniqueBy(
    rows
      .filter(
        (r) =>
          r.gds_sclsf_cd &&
          r.gds_sclsf_nm &&
          (!middleCode || r.gds_mclsf_cd === middleCode),
      )
      .map((r) => ({ code: r.gds_sclsf_cd, name: r.gds_sclsf_nm })),
    (o) => o.code,
  );
}
