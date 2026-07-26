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
import { PageTitle } from "@/components/PageTitle";
import { C } from "@/constants/hive-colors";
import { Card } from "@/components/hive/hive-shared";
import { FilterDropdown } from "@/components/FilterDropdown";
import { PullToRefresh } from "@/components/refresh/RefreshControl";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spacing } from "@/constants";
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
        className="flex-row items-center rounded-xl px-3 gap-2"
        style={{ backgroundColor: C.bg, height: 52 }}
      >
        <Feather name="search" size={19} color={C.ter} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="상표명 또는 병해충명으로 검색"
          placeholderTextColor={C.ter}
          style={{
            flex: 1,
            fontSize: 17,
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
          className="mt-1 bg-white rounded-xl"
          style={{
            borderWidth: 1,
            borderColor: C.border,
            elevation: 6,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 8,
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
                style={{ fontSize: 16, color: C.sec, flex: 1 }}
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
    style={{
      borderColor: C.border,
      backgroundColor: index % 2 === 0 ? C.white : C.bg,
    }}
  >
    {COLS.map(({ key, width }) => (
      <PretendardFont
        key={key}
        weight="regular"
        numberOfLines={2}
        style={{
          width,
          paddingHorizontal: 10,
          paddingVertical: 15,
          fontSize: 16,
          lineHeight: 22,
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
    return <ActivityIndicator size="large" color={C.primary} style={{ marginVertical: 48 }} />;
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
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchCodes(), refetchList()]);
  }, [refetchCodes, refetchList]);
  const handleRowPress = useCallback((item: ResultItem) => setSelectedItem(item), []);

  const tableContent = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View
          className="flex-row"
          style={{ backgroundColor: C.bgAlt, borderBottomWidth: 2, borderColor: C.border }}
        >
          {COLS.map(({ label, width }) => (
            <PretendardFont
              key={label}
              weight="semibold"
              style={{
                width,
                paddingHorizontal: 10,
                paddingVertical: 13,
                fontSize: 15,
                lineHeight: 20,
                color: C.sec,
                textAlign: "center",
                borderRightWidth: 1,
                borderColor: C.border,
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
              <View className="items-center justify-center py-12 px-4">
                <Feather name="search" size={40} color={C.ter} />
                <PretendardFont
                  weight="regular"
                  style={{ fontSize: 17, color: C.ter, marginTop: 12, textAlign: "center", lineHeight: 24 }}
                >
                  해당 조합으로 된 검색결과가 없습니다.
                </PretendardFont>
              </View>
            ) : null
          }
        />
      </View>
    </ScrollView>
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

      <PullToRefresh
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingTop: HEADER_HEIGHT + Spacing.lg,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
      >
        <PageTitle
          title="안심농약찾기"
          subtitle={`작물·용도·병해충으로\n등록 농약 안전 정보를 확인하세요`}
          subtitleStyle={{ fontSize: 18, lineHeight: 25, marginTop: 6 }}
        />

        {/* 관심 농약 — 저장된 항목이 있을 때만 렌더링 */}
        <InterestPesticideList />

        {/* 에러 배너 */}
        {codesError && (
          <Pressable
            onPress={refetchCodes}
            className="px-4 py-3 rounded-2xl active:opacity-80"
            style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}
          >
            <PretendardFont weight="semibold" style={{ fontSize: 16, color: "#DC2626", textAlign: "center", lineHeight: 23 }}>
              ⚠️ 옵션 목록 로딩 실패 — 탭하여 재시도
            </PretendardFont>
          </Pressable>
        )}
        {listError && (
          <Pressable
            onPress={refetchList}
            className="px-4 py-3 rounded-2xl active:opacity-80"
            style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}
          >
            <PretendardFont weight="semibold" style={{ fontSize: 16, color: "#DC2626", textAlign: "center", lineHeight: 23 }}>
              ⚠️ 데이터 로딩 실패 — 탭하여 재시도
            </PretendardFont>
          </Pressable>
        )}

        {/* 검색 + 필터 카드 */}
        <Card delay={0}>
          <PretendardFont weight="bold" style={{ fontSize: 19, color: C.text, marginBottom: 16 }}>
            검색 조건
          </PretendardFont>

          <SearchInput
            value={query}
            onChange={setQuery}
            suggestions={suggestions}
            onSuggestionPress={handleSuggestion}
          />

          <View style={{ height: 1, backgroundColor: C.bg, marginVertical: 16 }} />

          <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.ter, marginBottom: 10 }}>
            필터
          </PretendardFont>
          <View className="flex-row gap-2">
            <FilterDropdown label="작물명" value={crop} options={aList} onSelect={setCrop} allOption size="large" style={{ flex: 1 }} />
            <FilterDropdown label="용도" value={usage} options={bList} onSelect={setUsage} allOption size="large" style={{ flex: 1 }} />
            <FilterDropdown label="곤충" value={insect} options={cList} onSelect={setInsect} allOption size="large" style={{ flex: 1 }} />
          </View>
        </Card>

        {/* 결과 테이블 카드 */}
        <Card delay={100} style={{ padding: 0, overflow: "hidden" }}>
          {/* 카드 헤더 */}
          <View
            className="flex-row items-center justify-between"
            style={{ padding: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.bg }}
          >
            <View>
              <PretendardFont weight="bold" style={{ fontSize: 19, color: C.text }}>
                검색 결과
              </PretendardFont>
              {totalCount > 0 && (
                <PretendardFont style={{ fontSize: 15, color: C.ter, marginTop: 4 }}>
                  총 {totalCount}건
                </PretendardFont>
              )}
            </View>
            <Pressable
              onPress={() => setFullscreen(true)}
              hitSlop={8}
              className="active:opacity-70"
              style={{ padding: 8, backgroundColor: C.bg, borderRadius: 10 }}
            >
              <Feather name="maximize-2" size={16} color={C.sec} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 15, paddingVertical: 8 }}>
            <PretendardFont style={{ fontSize: 15, color: C.ter, lineHeight: 21 }}>
              좌우로 스크롤하여 전체 내용을 확인하세요
            </PretendardFont>
          </View>

          {showComboEmptyState && (
            <View className="px-4 pb-4">
              <View
                className="items-start rounded-2xl border px-4 py-3"
                style={{ backgroundColor: "#FFF7ED", borderColor: "#FDBA74" }}
              >
                <View className="flex-row items-center gap-2">
                  <Feather name="search" size={18} color="#C2410C" />
                  <PretendardFont weight="bold" style={{ fontSize: 17, color: "#9A3412" }}>
                    해당 조합의 검색결과가 없습니다
                  </PretendardFont>
                </View>
                <PretendardFont style={{ marginTop: 8, fontSize: 16, color: "#B45309", lineHeight: 23 }}>
                  다른 작물명·용도·곤충 조합으로 다시 찾아보세요.
                </PretendardFont>
              </View>
            </View>
          )}

          {tableContent}

          {totalCount > 0 && (
            <View
              className="flex-row items-center justify-between"
              style={{ padding: 15, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.bg }}
            >
              <PretendardFont weight="regular" style={{ fontSize: 16, color: C.ter }}>
                {totalCount}건
              </PretendardFont>
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} groupSize={5} size="large" />
              <View style={{ width: 40 }} />
            </View>
          )}

        </Card>
      </PullToRefresh>

      {/* 전체화면 모달 */}
      <Modal visible={fullscreen} animationType="slide" onRequestClose={() => setFullscreen(false)}>
        <View className="flex-1" style={{ backgroundColor: C.bg }}>
          <View
            className="flex-row items-center justify-between px-4 py-3 bg-white"
            style={{ borderBottomWidth: 1, borderColor: C.border }}
          >
            <View className="flex-row items-center gap-1.5">
              <PretendardFont weight="semibold" style={{ fontSize: 20, color: C.text }}>
                농약 검색 결과
              </PretendardFont>
              {totalCount > 0 && (
                <PretendardFont weight="regular" style={{ fontSize: 16, color: C.ter }}>
                  ({totalCount}건)
                </PretendardFont>
              )}
            </View>
            <Pressable onPress={() => setFullscreen(false)} hitSlop={12} className="active:opacity-60">
              <Feather name="minimize-2" size={20} color={C.sec} />
            </Pressable>
          </View>

          {showComboEmptyState && (
            <View className="px-4 pt-4">
              <View
                className="items-start rounded-2xl border px-4 py-3"
                style={{ backgroundColor: "#FFF7ED", borderColor: "#FDBA74" }}
              >
                <View className="flex-row items-center gap-2">
                  <Feather name="search" size={18} color="#C2410C" />
                  <PretendardFont weight="bold" style={{ fontSize: 17, color: "#9A3412" }}>
                    해당 조합의 검색결과가 없습니다
                  </PretendardFont>
                </View>
                <PretendardFont style={{ marginTop: 8, fontSize: 16, color: "#B45309", lineHeight: 23 }}>
                  다른 작물명·용도·곤충 조합으로 다시 찾아보세요.
                </PretendardFont>
              </View>
            </View>
          )}

          <ScrollView>{tableContent}</ScrollView>

          {totalCount > 0 && (
            <View
              className="flex-row items-center justify-between px-4 py-3 bg-white"
              style={{ borderTopWidth: 1, borderColor: C.border }}
            >
              <PretendardFont weight="regular" style={{ fontSize: 16, color: C.ter }}>
                {totalCount}건
              </PretendardFont>
              <Pagination page={page} totalPages={totalPages} onPage={handlePage} groupSize={5} size="large" />
              <View style={{ width: 40 }} />
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
