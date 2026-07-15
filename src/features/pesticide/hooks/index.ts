import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { PUBLIC_CONFIG } from "@/lib/publicConfig";
import { assertNongsaroSuccess, parseOptions, parseResults } from "./utils";
import { usePesticideStore } from "./store";

const BASE = PUBLIC_CONFIG.nongsaroBaseUrl.replace(/\/+$/, "");
const API_KEY = PUBLIC_CONFIG.nongsaroApiKey;
const ROWS_PER_PAGE = 15;
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 2000;

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
const safeText = (value: unknown) => (typeof value === "string" ? value : "");

function assertNongsaroConfig() {
  if (!BASE) {
    throw new Error("농약 정보 API 주소가 설정되지 않았습니다.");
  }
  if (!API_KEY) {
    throw new Error("농약 정보 API 인증키가 설정되지 않았습니다.");
  }
}

export const useCodeOptions = () => {
  const { aList, bList, cList, setOptions } = usePesticideStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetch = async () => {
    if (aList.length > 0) return;

    setIsLoading(true);
    setIsError(false);

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        assertNongsaroConfig();

        const { data } = await axios.get(`${BASE}/insectAgchApplcCode`, {
          params: { apiKey: API_KEY },
          responseType: "text",
        });

        assertNongsaroSuccess(data);
        const opts = parseOptions(data);
        const result = {
          aList: opts.filter((d) => d.code === "A").map((d) => d.codeNm),
          bList: opts.filter((d) => d.code === "B").map((d) => d.codeNm),
          cList: opts.filter((d) => d.code === "C").map((d) => d.codeNm),
        };

        if (
          !result.aList.length &&
          !result.bList.length &&
          !result.cList.length
        ) {
          throw new Error("코드 목록이 비어 있습니다.");
        }

        setOptions(result.aList, result.bList, result.cList);
        setIsLoading(false);
        return;
      } catch (err) {
        console.error("[Pesticide API] code options request failed", err);
        if (attempt === MAX_RETRY) {
          setIsError(true);
          setIsLoading(false);
          return;
        }
        await wait(RETRY_DELAY_MS);
      }
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return { isLoading, isError, refetch: fetch };
};

export const usePesticideList = () => {
  const { crop, usage, insect, page, query, allItems, setAllItems } =
    usePesticideStore();
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetch = async () => {
    if (allItems.length > 0) return;

    setIsFetching(true);
    setIsError(false);

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        assertNongsaroConfig();

        const { data } = await axios.get(`${BASE}/insectAgchApplcLst`, {
          params: { apiKey: API_KEY, numOfRows: "1000", pageNo: "1" },
          responseType: "text",
        });

        assertNongsaroSuccess(data);
        const items = parseResults(data);
        if (!items.length) throw new Error("농약 데이터가 비어 있습니다.");

        setAllItems(items);
        setIsFetching(false);
        return;
      } catch (err) {
        console.error("[Pesticide API] pesticide list request failed", err);
        if (attempt === MAX_RETRY) {
          setIsError(true);
          setIsFetching(false);
          return;
        }
        await wait(RETRY_DELAY_MS);
      }
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((r) => {
      const matchFilter =
        (!crop || r.cropsNm === crop) &&
        (!usage || r.prpos === usage) &&
        (!insect || r.sprngspcsNm === insect);

      const matchQuery =
        !q ||
        safeText(r.brandNm).toLowerCase().includes(q) ||
        safeText(r.applcsicknsHlsctsickns).toLowerCase().includes(q);

      return matchFilter && matchQuery;
    });
  }, [allItems, crop, usage, insect, query]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const set = new Set<string>();

    allItems.forEach((r) => {
      const brandName = safeText(r.brandNm);
      const diseaseName = safeText(r.applcsicknsHlsctsickns);

      if (brandName.toLowerCase().includes(q)) set.add(brandName);
      if (diseaseName.toLowerCase().includes(q)) set.add(diseaseName);
    });

    return Array.from(set).slice(0, 8);
  }, [allItems, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / ROWS_PER_PAGE),
  );
  const items = filteredItems.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE,
  );

  return {
    items,
    totalPages,
    totalCount: filteredItems.length,
    suggestions,
    isFetching,
    isError,
    refetch: fetch,
  };
};
