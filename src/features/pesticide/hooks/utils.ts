/**
 * XML 파서 — CDATA 완전 처리
 */

export type SelectOption = { code: string; codeNm: string };

export type ResultItem = {
  agchmApplcNo: string;
  prdlstNm: string;
  brandNm: string;
  contInfo: string;
  prpos: string;
  applcsicknsHlsctsickns: string;
  safeRdmtrTime: string;
  sprngspcsNm: string;
  cropsNm: string;
};

/** CDATA 포함 태그 값 추출 + trim */
const getTag = (str: string, tag: string): string => {
  const match = str.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return "";
  const raw = match[1].trim(); // 👈 여기서 trim 먼저
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/); // 👈 ^ $ 앵커 추가
  return (cdata ? cdata[1] : raw).trim();
};

const getItems = (xml: string): string[] =>
  xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

export const parseOptions = (xml: string): SelectOption[] =>
  getItems(xml).map((item) => ({
    code: getTag(item, "code"),
    codeNm: getTag(item, "codeNm"),
  }));

export const parseResults = (xml: string): ResultItem[] =>
  getItems(xml).map((item) => ({
    agchmApplcNo: getTag(item, "agchmApplcNo"),
    prdlstNm: getTag(item, "prdlstNm"),
    brandNm: getTag(item, "brandNm"),
    contInfo: getTag(item, "contInfo"),
    prpos: getTag(item, "prpos"),
    applcsicknsHlsctsickns: getTag(item, "applcsicknsHlsctsickns"),
    safeRdmtrTime: getTag(item, "safeRdmtrTime"),
    sprngspcsNm: getTag(item, "sprngspcsNm"),
    cropsNm: getTag(item, "cropsNm"),
  }));
