/**
 * 농약 검색 커스텀 훅
 *
 * useCodeOptions
 *   - 작물/용도/곤충 드롭다운 코드 목록 조회
 *   - AsyncStorage에 있으면 API 호출 생략
 *   - 실패 시 2초 간격 최대 3회 재시도
 *
 * usePesticideList
 *   - 전체 데이터 1회 조회 후 클라이언트 필터링
 *   - AsyncStorage에 있으면 API 호출 없음
 *   - 필터/페이지는 useMemo + slice로 처리
 */

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { parseOptions, parseResults } from "./utils";
import { usePesticideStore } from "./store";

const BASE = process.env.EXPO_PUBLIC_NONGSARO_BASE_URL!;
const API_KEY = process.env.EXPO_PUBLIC_NONGSARO_API_KEY!;
const ROWS_PER_PAGE = 15;
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 2000;

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ── 드롭다운 코드 목록 ────────────────────────────────────────────────────────
export const useCodeOptions = () => {
  const { aList, bList, cList, setOptions } = usePesticideStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetch = async () => {
    if (aList.length > 0) return; // 저장된 데이터 있으면 스킵

    setIsLoading(true);
    setIsError(false);

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        const { data } = await axios.get(`${BASE}/insectAgchApplcCode`, {
          params: { apiKey: API_KEY },
          responseType: "text",
        });

        console.log("[농약API] raw 응답 앞 500자!!:", data.slice(0, 500));

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
          throw new Error("코드 목록이 비어있습니다.");
        }

        setOptions(result.aList, result.bList, result.cList);
        console.log("[농약API] ✅ 코드 목록 로드 성공");
        console.log(
          `[농약API] 작물 ${result.aList.length}건 | 용도 ${result.bList.length}건 | 곤충 ${result.cList.length}건`,
        );

        setIsLoading(false);
        return;
      } catch (err) {
        console.warn(
          `[농약API] ❌ 코드 목록 ${attempt}/${MAX_RETRY} 실패 — ${(err as Error).message}`,
        );

        if (attempt === MAX_RETRY) {
          console.error("[농약API] 🚨 코드 목록 최대 재시도 초과");
          setIsError(true);
          setIsLoading(false);
          return;
        }

        console.log(`[농약API] ⏳ ${RETRY_DELAY_MS / 1000}초 후 재시도...`);
        await wait(RETRY_DELAY_MS);
      }
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  return { isLoading, isError, refetch: fetch };
};

// ── 전체 데이터 조회 + 필터링 + 페이지네이션 ─────────────────────────────────
export const usePesticideList = () => {
  const { crop, usage, insect, page, allItems, setAllItems } =
    usePesticideStore();
  const [isFetching, setIsFetching] = useState(false);
  const [isError, setIsError] = useState(false);

  const fetch = async () => {
    if (allItems.length > 0) return; // 저장된 데이터 있으면 스킵

    setIsFetching(true);
    setIsError(false);

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        const { data } = await axios.get(`${BASE}/insectAgchApplcLst`, {
          params: { apiKey: API_KEY, numOfRows: "1000", pageNo: "1" },
          responseType: "text",
        });

        const items = parseResults(data);

        if (!items.length) throw new Error("데이터가 비어있습니다.");

        setAllItems(items);
        console.log("[농약API] ✅ 전체 목록 로드 성공");
        console.log(`[농약API] 총 ${items.length}건 저장 완료`);

        setIsFetching(false);
        return;
      } catch (err) {
        console.warn(
          `[농약API] ❌ 전체 목록 ${attempt}/${MAX_RETRY} 실패 — ${(err as Error).message}`,
        );

        if (attempt === MAX_RETRY) {
          console.error("[농약API] 🚨 전체 목록 최대 재시도 초과");
          setIsError(true);
          setIsFetching(false);
          return;
        }

        console.log(`[농약API] ⏳ ${RETRY_DELAY_MS / 1000}초 후 재시도...`);
        await wait(RETRY_DELAY_MS);
      }
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  // 필터링 — 저장된 전체 데이터에서 JS filter()
  const filteredItems = useMemo(
    () =>
      allItems.filter(
        (r) =>
          (!crop || r.cropsNm === crop) &&
          (!usage || r.prpos === usage) &&
          (!insect || r.sprngspcsNm === insect),
      ),
    [allItems, crop, usage, insect],
  );

  // 페이지네이션
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
    isFetching,
    isError,
    refetch: fetch,
  };
};
