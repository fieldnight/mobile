import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useCodeOptions, usePesticideList } from "@/features/pesticide/hooks";
import { usePesticideStore, InterestPesticideList } from "@/features/pesticide";
import { PesticideDetailSheet } from "@/features/pesticide/components/PesticideDetailSheet";
import type { ResultItem } from "@/features/pesticide";
import Pagination from "@/components/pagination";
import { COLS } from "@/constants";
import AppHeader from "@/components/AppHeader";
import { HEADER_HEIGHT } from "@/hooks";
import { useRouter } from "expo-router";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { Card } from "@/components/hive/hive-shared";
import { FilterDropdown } from "@/components/FilterDropdown";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppToast } from "@/components/ToastContext";

// ── 검색창 ─────────────────────────────────────────────────────────────────────
function SearchInput({
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
    <View>
      <View
        className="flex-row items-center rounded-lg px-3 gap-2"
        style={{ backgroundColor: C.bgAlt, height: 42 }}
      >
        <Feather name="search" size={17} color={C.ter} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="상표명 또는 병해충명으로 검색"
          placeholderTextColor={C.ter}
          style={{
            flex: 1,
            fontSize: 15,
            color: C.text,
            fontFamily: "Pretendard-Regular",
          }}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChange("")} hitSlop={8}>
            <Feather name="x" size={18} color={C.ter} />
          </Pressable>
        )}
      </View>

      {showSuggestions && (
        <View
          className="mt-1 bg-white rounded-lg"
          style={{
            borderWidth: 1,
            borderColor: C.border,
            zIndex: 100,
          }}
        >
          {suggestions.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => onSuggestionPress(s)}
              className="flex-row items-center gap-2 px-4 py-3 active:opacity-70"
              style={{ borderBottomWidth: 1, borderColor: C.bg }}
            >
              <Feather name="clock" size={16} color={C.ter} />
              <PretendardFont
                weight="regular"
                style={{ fontSize: 15, color: C.text, flex: 1 }}
                numberOfLines={1}
              >
                {s}
              </PretendardFont>
              <Feather name="arrow-up-left" size={16} color={C.ter} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── 테이블 행 ─────────────────────────────────────────────────────────────────
const ResultRow = memo(({ item, index, onPress }: { item: ResultItem; index: number; onPress: (item: ResultItem) => void }) => (
  <Pressable
    onPress={() => onPress(item)}
    className="flex-row border-b active:opacity-70"
    style={{ borderColor: C.bg }}
  >
    {COLS.map(({ key, width }) => (
      <PretendardFont
        key={key}
        weight="regular"
        numberOfLines={2}
        style={{
          width,
          paddingHorizontal: 10,
          paddingVertical: 11,
          fontSize: 14,
          lineHeight: 19,
          color: C.text,
        }}
      >
        {item[key as keyof ResultItem]}
      </PretendardFont>
    ))}
  </Pressable>
));

// ── 테이블 내용 ───────────────────────────────────────────────────────────────
function TableBody({
  isFetching,
  items,
  emptyState,
  onRowPress,
}: {
  isFetching: boolean;
  items: ResultItem[];
  emptyState?: React.ReactNode;
  onRowPress: (item: ResultItem) => void;
}) {
  if (isFetching) {
    return <ActivityIndicator color={C.sec} style={{ marginVertical: 40 }} />;
  }
  if (items.length === 0) {
    return <>{emptyState ?? null}</>;
  }
  return (
    <>
      {items.map((item, index) => (
        <ResultRow key={item.agchmApplcNo + index} item={item} index={index} onPress={onRowPress} />
      ))}
    </>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
export default function PesticideTable() {
  const {
    crop, usage, insect, page, query,
    aList, bList, cList,
    setCrop, setUsage, setInsect, setPage, setQuery,
  } = usePesticideStore();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResultItem | null>(null);
  const { show: showToast } = useAppToast();
  const emptyToastShownRef = useRef("");

  const { isError: codesError, refetch: refetchCodes } = useCodeOptions();
  const { items, totalPages, totalCount, suggestions, isFetching, isError: listError, refetch: refetchList } =
    usePesticideList();
  const selectedFilterCount = [crop, usage, insect].filter(Boolean).length;
  const hasQuery = query.trim().length > 0;
  const showComboEmptyState =
    !hasQuery && selectedFilterCount >= 2 && !isFetching && !listError && items.length === 0;
  const showDefaultEmptyState =
    !showComboEmptyState && !isFetching && !listError && items.length === 0;

  const comboKey = `${crop}|${usage}|${insect}`;

  useEffect(() => {
    emptyToastShownRef.current = "";
  }, [comboKey]);

  useEffect(() => {
    if (!showComboEmptyState) return;
    if (emptyToastShownRef.current === comboKey) return;

    emptyToastShownRef.current = comboKey;
    showToast(
      "해당 조합의 검색결과가 없습니다. 다른 작물·용도·곤충 조합을 선택해 주세요.",
      "error",
    );
  }, [comboKey, showComboEmptyState, showToast]);

  const handlePage = useCallback((p: number) => setPage(p), []);
  const handleSuggestion = useCallback((s: string) => setQuery(s), []);
  const handleRowPress = useCallback((item: ResultItem) => setSelectedItem(item), []);

  const tableContent = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View
          className="flex-row"
          style={{ borderBottomWidth: 1, borderColor: C.border }}
        >
          {COLS.map(({ label, width }) => (
            <PretendardFont
              key={label}
              weight="semibold"
              style={{
                width,
                paddingHorizontal: 10,
                paddingVertical: 9,
                fontSize: 13,
                lineHeight: 18,
                color: C.ter,
              }}
            >
              {label}
            </PretendardFont>
          ))}
        </View>
        <TableBody
          isFetching={isFetching}
          items={items}
          onRowPress={handleRowPress}
          emptyState={
            showDefaultEmptyState ? (
              <View className="items-center justify-center py-10 px-4">
                <PretendardFont style={{ fontSize: 14, color: C.sec, textAlign: "center" }}>
                  검색 결과가 없어요
                </PretendardFont>
              </View>
            ) : null
          }
        />
      </View>
    </ScrollView>
  );

  const comboEmptyNotice = (
    <PretendardFont style={{ fontSize: 14, color: C.sec, paddingHorizontal: 14, paddingVertical: 12 }}>
      이 조합은 결과가 없어요. 다른 조합을 골라 보세요.
    </PretendardFont>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: C.bg }}>
      <AppHeader
        title="안심농약찾기"
        onBack={() => router.back()}
        rightAction={{
          icon: "maximize-2",
          color: C.sec,
          onPress: () => setFullscreen(true),
          testId: "button-fullscreen",
        }}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: HEADER_HEIGHT + 10,
          paddingBottom: insets.bottom + 40,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 관심 농약 — 저장된 항목이 있을 때만 렌더링 */}
        <InterestPesticideList />

        {/* 에러 배너 */}
        {codesError && (
          <Pressable
            onPress={refetchCodes}
            className="px-4 py-3 rounded-xl bg-white active:opacity-80"
          >
            <PretendardFont weight="medium" style={{ fontSize: 14, color: C.error }}>
              검색 옵션을 불러오지 못했어요 · 눌러서 다시 시도
            </PretendardFont>
          </Pressable>
        )}
        {listError && (
          <Pressable
            onPress={refetchList}
            className="px-4 py-3 rounded-xl bg-white active:opacity-80"
          >
            <PretendardFont weight="medium" style={{ fontSize: 14, color: C.error }}>
              검색 결과를 불러오지 못했어요 · 눌러서 다시 시도
            </PretendardFont>
          </Pressable>
        )}

        {/* 검색 + 필터 카드 */}
        <Card delay={0} style={{ padding: 12 }}>

          <SearchInput
            value={query}
            onChange={setQuery}
            suggestions={suggestions}
            onSuggestionPress={handleSuggestion}
          />

          <View style={{ height: 8 }} />

          <View className="flex-row gap-1.5">
            <FilterDropdown label="작물명" value={crop} options={aList} onSelect={setCrop} allOption style={{ flex: 1 }} />
            <FilterDropdown label="용도" value={usage} options={bList} onSelect={setUsage} allOption style={{ flex: 1 }} />
            <FilterDropdown label="곤충" value={insect} options={cList} onSelect={setInsect} allOption style={{ flex: 1 }} />
          </View>
        </Card>

        {/* 결과 테이블 카드 */}
        <Card delay={100} style={{ padding: 0, overflow: "hidden" }}>
          {/* 카드 헤더 */}
          <View className="flex-row items-baseline gap-1.5" style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
            <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
              검색 결과
            </PretendardFont>
            {totalCount > 0 && (
              <PretendardFont style={{ fontSize: 13, color: C.sec }}>
                {totalCount.toLocaleString()}건
              </PretendardFont>
            )}
          </View>

          {showComboEmptyState && comboEmptyNotice}

          {tableContent}

          {totalCount > 0 && (
            <View
              className="flex-row items-center justify-between"
              style={{ paddingHorizontal: 8, paddingVertical: 2 }}
            >
              <View style={{ flex: 1 }} />
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} groupSize={5} />
              <View style={{ flex: 1 }} />
            </View>
          )}

        </Card>
      </ScrollView>

      {/* 전체화면 모달 */}
      <Modal visible={fullscreen} animationType="slide" onRequestClose={() => setFullscreen(false)}>
        <View className="flex-1" style={{ backgroundColor: C.bg }}>
          <View
            className="flex-row items-center justify-between px-4 py-3 bg-white"
            style={{ borderBottomWidth: 1, borderColor: C.border }}
          >
            <View className="flex-row items-center gap-1.5">
              <PretendardFont weight="semibold" style={{ fontSize: 17, color: C.text }}>
                농약 검색 결과
              </PretendardFont>
              {totalCount > 0 && (
                <PretendardFont weight="regular" style={{ fontSize: 14, color: C.sec }}>
                  {totalCount.toLocaleString()}건
                </PretendardFont>
              )}
            </View>
            <Pressable onPress={() => setFullscreen(false)} hitSlop={12} className="active:opacity-60">
              <Feather name="minimize-2" size={20} color={C.sec} />
            </Pressable>
          </View>

          {showComboEmptyState && comboEmptyNotice}

          <ScrollView>{tableContent}</ScrollView>

          {totalCount > 0 && (
            <View
              className="flex-row items-center justify-between px-4 py-3 bg-white"
              style={{ borderTopWidth: 1, borderColor: C.border }}
            >
              <View style={{ flex: 1 }} />
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} groupSize={5} />
              <View style={{ flex: 1 }} />
            </View>
          )}
        </View>
      </Modal>

      {/* 농약 상세 + 관심 저장 바텀시트 */}
      <PesticideDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </View>
  );
}
