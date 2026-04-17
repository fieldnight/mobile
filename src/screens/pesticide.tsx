/**
 * 농약 검색 화면
 */

import { memo, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useCodeOptions, usePesticideList } from "@/features/pesticide/hooks";
import { usePesticideStore } from "@/features/pesticide";
import type { ResultItem } from "@/features/pesticide";
import Pagination from "@/components/pagination";
import { COLS } from "@/constants";
import AppHeader from "@/components/AppHeader";
import { useRouter } from "expo-router";



// ── 행 ────────────────────────────────────────────────────────────────────────
const ResultRow = memo(
  ({ item, index }: { item: ResultItem; index: number }) => (
    <View
      className={`flex-row border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
    >
      {COLS.map(({ key, width }) => (
        <Text
          key={key}
          numberOfLines={2}
          style={{ width }}
          className="px-2 py-3 text-base text-slate-700"
        >
          {item[key as keyof ResultItem]}
        </Text>
      ))}
    </View>
  ),
);

// ── 메인 ──────────────────────────────────────────────────────────────────────
export default function PesticideTable() {
  const {
    crop,
    usage,
    insect,
    page,
    aList,
    bList,
    cList,
    setCrop,
    setUsage,
    setInsect,
    setPage,
  } = usePesticideStore();

  const router = useRouter();

  const { isError: codesError, refetch: refetchCodes } = useCodeOptions();
  const {
    items,
    totalPages,
    totalCount,
    isFetching,
    isError: listError,
    refetch: refetchList,
  } = usePesticideList();

  const handlePage = useCallback((p: number) => setPage(p), []);


  return (
    <View className="flex-1 bg-slate-50">
      {/* 헤더 */}
      <AppHeader title="내 작물에 맞는 농약 찾기" onBack={() => router.back()} />
      <View className="px-4 pt-5 pb-3 bg-white border-b border-slate-100">
        <Text className="text-xs text-slate-400 mt-1">
          작물, 용도, 곤충을 선택하면 농약 적용 정보를 확인할 수 있습니다.
        </Text>
      </View>

      {/* 에러 배너 */}
      {codesError && (
        <TouchableOpacity
          onPress={refetchCodes}
          className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <Text className="text-red-600 text-sm text-center">
            ⚠️ 옵션 목록 로딩 실패 — 탭하여 재시도
          </Text>
        </TouchableOpacity>
      )}
      {listError && (
        <TouchableOpacity
          onPress={refetchList}
          className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg"
        >
          <Text className="text-red-600 text-sm text-center">
            ⚠️ 데이터 로딩 실패 — 탭하여 재시도
          </Text>
        </TouchableOpacity>
      )}

      {/* 드롭다운 */}
      <View className="px-4 py-1 bg-white border-b border-slate-100">
        <View className="flex-row gap-2">
          {(
            [
              { label: "작물명", value: crop, list: aList, set: setCrop },
              { label: "용도", value: usage, list: bList, set: setUsage },
              { label: "곤충", value: insect, list: cList, set: setInsect },
            ] as const
          ).map(({ label, value, list, set }) => (
            <View
              key={label}
              className="flex-auto bg-white border border-slate-200 rounded-lg overflow-hidden"
            >
              <Text className="text-xs font-bold text-slate-500 px-2 pt-1">
                {label}
              </Text>
              <Picker
                selectedValue={value}
                onValueChange={(v) => set(v as string)}
                style={{ height: 44, marginTop: -4 }}
                dropdownIconColor="#94a3b8"
              >
                <Picker.Item label="전체" value="" color="#111827" />
                {list.map((v) => (
                  <Picker.Item key={v} label={v} value={v} color="#111827" />
                ))}
              </Picker>
            </View>
          ))}
        </View>
      </View>

      <View className="px-4 py-1.5 bg-slate-100">
        <Text className="text-xs text-slate-400 text-center">
          행을 좌우로 스크롤하여 전체 내용을 확인하세요
        </Text>
      </View>

      {/* 테이블 */}
      <View className="flex-1">
        <ScrollView horizontal>
          <View>
            {/* 헤더 행 */}
            <View className="flex-row bg-slate-100 border-b-2 border-slate-300">
              {COLS.map(({ label, width }) => (
                <Text
                  key={label}
                  style={{ width }}
                  className="px-2 py-2 text-sm font-bold text-slate-500 text-center border-r border-slate-200"
                >
                  {label}
                </Text>
              ))}
            </View>

            {/* 바디 */}
            {isFetching ? (
              <ActivityIndicator
                size="large"
                color="#2563eb"
                style={{ marginVertical: 48 }}
              />
            ) : items.length === 0 ? (
              <Text className="text-center text-slate-400 text-base py-12 px-4">
                해당 조합으로 된 검색결과가 없습니다.
              </Text>
            ) : (
              <ScrollView>
                {items.map((item, index) => (
                  <ResultRow
                    key={item.agchmApplcNo + index}
                    item={item}
                    index={index}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </View>

      {/* 하단 — 총 건수 + 페이지네이션 */}
      {totalCount > 0 && (
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-t border-slate-200">
          <Text className="text-slate-400 text-sm">{`총 ${totalCount}건`}</Text>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={handlePage}
            groupSize={5}
          />
          <View className="w-10" />
        </View>
      )}
    </View>
  );
}
