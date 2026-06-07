/**
 * 농약 검색 화면
 * 추가: 상표명/병해충명 검색 + 추천 검색어 + 전체화면 토글
 */

import { memo, useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  Modal,
  RefreshControl,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Feather } from "@expo/vector-icons";
import { useCodeOptions, usePesticideList } from "@/features/pesticide/hooks";
import { usePesticideStore } from "@/features/pesticide";
import type { ResultItem } from "@/features/pesticide";
import Pagination from "@/components/pagination";
import { COLS } from "@/constants";
import AppHeader from "@/components/AppHeader";
import { HEADER_HEIGHT } from "@/hooks";
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

// ── 검색 바 ───────────────────────────────────────────────────────────────────
function SearchBar({
  value,
  onChange,
  suggestions,
  onSuggestionPress,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  onSuggestionPress: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const showSuggestions = focused && suggestions.length > 0;

  return (
    <View className="px-4 py-2 bg-white border-b border-slate-100">
      {/* 입력창 */}
      <View
        className="flex-row items-center rounded-xl px-3 gap-2"
        style={{ backgroundColor: "#F4F5F7", height: 44 }}
      >
        <Feather name="search" size={16} color="#94a3b8" />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="상표명 또는 병해충명으로 검색"
          placeholderTextColor="#B0B8C1"
          style={{ flex: 1, fontSize: 14, color: "#191F28" }}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChange("")} hitSlop={8}>
            <Feather name="x" size={15} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      {/* 추천 검색어 드롭다운 */}
      {showSuggestions && (
        <View
          className="mt-1 bg-white rounded-xl border border-slate-100"
          style={{
            elevation: 4,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
          }}
        >
          {suggestions.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => onSuggestionPress(s)}
              className="flex-row items-center gap-2 px-4 py-3 border-b border-slate-50"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Feather name="clock" size={13} color="#B0B8C1" />
              <Text className="text-sm text-slate-600 flex-1" numberOfLines={1}>
                {s}
              </Text>
              <Feather name="arrow-up-left" size={13} color="#B0B8C1" />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── 테이블 본체 (전체화면 모달에서도 재사용) ──────────────────────────────────
function TableBody({
  isFetching,
  items,
  onRefresh,
}: {
  isFetching: boolean;
  items: ResultItem[];
  onRefresh?: () => void;
}) {
  if (isFetching) {
    return (
      <ActivityIndicator
        size="large"
        color="#2563eb"
        style={{ marginVertical: 48 }}
      />
    );
  }
  if (items.length === 0) {
    return (
      <Text className="text-center text-slate-400 text-base py-12 px-4">
        해당 조합으로 된 검색결과가 없습니다.
      </Text>
    );
  }
  return (
    <ScrollView
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor="#EA580C"
            progressBackgroundColor="#FFFFFF"
            colors={["#EA580C", "#F59E0B"]}
          />
        ) : undefined
      }
    >
      {items.map((item, index) => (
        <ResultRow key={item.agchmApplcNo + index} item={item} index={index} />
      ))}
    </ScrollView>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
export default function PesticideTable() {
  const {
    crop,
    usage,
    insect,
    page,
    query,
    aList,
    bList,
    cList,
    setCrop,
    setUsage,
    setInsect,
    setPage,
    setQuery,
  } = usePesticideStore();

  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(false);

  const { isError: codesError, refetch: refetchCodes } = useCodeOptions();
  const {
    items,
    totalPages,
    totalCount,
    suggestions,
    isFetching,
    isError: listError,
    refetch: refetchList,
  } = usePesticideList();

  const handlePage = useCallback((p: number) => setPage(p), []);
  const handleSuggestion = useCallback((s: string) => {
    setQuery(s);
  }, []);

  // ── 테이블 공통 UI ──
  const tableUI = (
    <ScrollView horizontal>
      <View>
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
        <TableBody
          isFetching={isFetching}
          items={items}
          onRefresh={() => { refetchCodes(); refetchList(); }}
        />
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-slate-50">
      {/* 헤더 */}
      <AppHeader
        title="안심농약찾기"
        onBack={() => router.back()}
        rightAction={{
          icon: "maximize-2",
          color: "#64748b",
          onPress: () => setFullscreen(true),
          testId: "button-fullscreen",
        }}
      />

      <View className="px-4 pb-2 bg-white border-b border-slate-100" style={{ paddingTop: HEADER_HEIGHT + 12 }}>
        <Text className="text-xs text-slate-400">
          작물, 용도, 곤충을 선택하거나 상표명/병해충명으로 검색하세요.
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

      {/* 검색 바 */}
      <SearchBar
        value={query}
        onChange={setQuery}
        suggestions={suggestions}
        onSuggestionPress={handleSuggestion}
      />

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
      <View className="flex-1">{tableUI}</View>

      {/* 하단 */}
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

      {/* 전체화면 모달 */}
      <Modal
        visible={fullscreen}
        animationType="slide"
        onRequestClose={() => setFullscreen(false)}
      >
        <View className="flex-1 bg-slate-50">
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
            <Text className="text-base font-semibold text-slate-800">
              농약 검색 결과
              {totalCount > 0 && (
                <Text className="text-slate-400 text-sm">
                  {" "}
                  ({totalCount}건)
                </Text>
              )}
            </Text>
            <Pressable
              onPress={() => setFullscreen(false)}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Feather name="minimize-2" size={20} color="#64748b" />
            </Pressable>
          </View>

          <View className="flex-1">{tableUI}</View>

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
      </Modal>
    </View>
  );
}
