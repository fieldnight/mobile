/**
 * 도매시장 시세 메인 화면
 * - DetailModal       : 행 탭 시 열리는 낙찰 상세 정보 모달
 * - ZoomableTable     : 핀치 줌·가로 스크롤 지원 시세 테이블
 * - ClassifyDropdown  : 대·중·소 분류 바텀시트 드롭다운
 * - FruitPriceScreen  : Card 3개 구조 (내 맞춤 시세 / 도매시장 설정 / 조회 결과)
 *                       날짜 이동, 시장 선택, 분류 필터, 빠른 검색, 페이지네이션
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  View,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  RefreshControl,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  clamp,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import {
  useTradeStore,
  getLargeOptions,
  getMiddleOptions,
  getSmallOptions,
  type InterestMarket,
} from "@/features/fruit-price";
import type { Row } from "@/types";
import {
  middleKey,
  COLUMNS,
  DETAIL_FIELDS,
  getTodayKST,
  QUICK_SEARCH_ITEMS,
} from "@/constants";
import Pagination from "@/components/pagination";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import { Toast, useToast } from "@/components/Toast";
import { SortBar, sortRows, type SortKey } from "@/components/SortBar";
import { PretendardFont } from "@/components/PretendardFont";
import { PageTitle } from "@/components/PageTitle";
import { C } from "@/constants/hive-colors";
import { Card } from "@/components/hive/hive-shared";
import { InterestMarketSection } from "./InterestMarketSection";
import { FilterPanel } from "./FilterPanel";

const NUM_OF_ROWS = 15;
const BASE_FONT = 13;
const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;
const EMPTY_ROWS: Row[] = [];

// ── 상세 모달 ─────────────────────────────────────────────────────────────────
function DetailModal({
  row,
  onClose,
}: {
  row: Row | null;
  onClose: () => void;
}) {
  if (!row) return null;
  return (
    <Modal transparent>
      <Pressable
        className="flex-1 justify-center px-4"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
      >
        <Pressable className="bg-white rounded-2xl overflow-hidden">
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{
              backgroundColor: C.bg,
              borderBottomWidth: 1,
              borderColor: C.border,
            }}
          >
            <PretendardFont
              weight="bold"
              style={{ fontSize: 16, color: C.text }}
            >
              상세 정보
            </PretendardFont>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="active:opacity-60"
            >
              <Feather name="x" size={18} color={C.ter} />
            </Pressable>
          </View>
          <GHScrollView className="px-5 py-2">
            {DETAIL_FIELDS.filter(({ key }) => {
              const value = row[key];
              return value !== null && value !== undefined && value !== "";
            }).map(
              ({ key, label }) => (
                <View
                  key={key}
                  className="flex-row py-2 border-b"
                  style={{ borderColor: C.bg }}
                >
                  <PretendardFont
                    weight="semibold"
                    style={{ fontSize: 12, color: C.ter, width: 112 }}
                  >
                    {label}
                  </PretendardFont>
                  <PretendardFont
                    style={{ fontSize: 14, color: C.text, flex: 1 }}
                  >
                    {key === "scsbd_prc"
                      ? `${Number(row[key]).toLocaleString("ko-KR")}원`
                      : row[key]}
                  </PretendardFont>
                </View>
              ),
            )}
          </GHScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── 확대 가능 테이블 ───────────────────────────────────────────────────────────
function ZoomableTable({
  rows,
  onRowPress,
}: {
  rows: Row[];
  onRowPress: (r: Row) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    transformOrigin: "top left",
  }));

  return (
    <GestureDetector gesture={pinchGesture}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Animated.View style={animatedStyle}>
          <View
            className="flex-row"
            style={{
              backgroundColor: C.bg,
              borderBottomWidth: 2,
              borderColor: C.border,
            }}
          >
            {COLUMNS.map((col) => (
              <View
                key={col.key}
                style={{
                  width: col.baseWidth,
                  paddingHorizontal: 8,
                  paddingVertical: 8,
                  borderRightWidth: 1,
                  borderColor: C.border,
                }}
              >
                <PretendardFont
                  weight="semibold"
                  style={{
                    fontSize: BASE_FONT - 1,
                    color: C.sec,
                    textAlign: "center",
                  }}
                >
                  {col.label}
                </PretendardFont>
              </View>
            ))}
          </View>
          {rows.map((row, i) => (
            <Pressable
              key={i}
              onPress={() => onRowPress(row)}
              className="flex-row border-b active:opacity-70"
              style={{
                borderColor: C.border,
                backgroundColor: i % 2 === 0 ? C.white : C.bg,
              }}
            >
              {COLUMNS.map((col) => (
                <View
                  key={col.key}
                  style={{
                    width: col.baseWidth,
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    borderRightWidth: 1,
                    borderColor: C.border,
                    justifyContent: "center",
                  }}
                >
                  <PretendardFont
                    weight={col.key === "scsbd_prc" ? "bold" : "regular"}
                    style={{
                      fontSize: BASE_FONT,
                      textAlign: "center",
                      color: col.key === "scsbd_prc" ? C.primary : C.text,
                    }}
                    numberOfLines={1}
                  >
                    {col.key === "scsbd_prc"
                      ? Number(row[col.key]).toLocaleString("ko-KR")
                      : col.key === "scsbd_dt"
                        ? (row[col.key]?.split(" ")[1] ?? "—")
                        : row[col.key] || "—"}
                  </PretendardFont>
                </View>
              ))}
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
    </GestureDetector>
  );
}

// ── 대/중/소 드롭다운 ─────────────────────────────────────────────────────────
function ClassifyDropdown({
  label,
  value,
  options,
  onSelect,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { code: string; name: string }[];
  onSelect: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.code === value);
  const active = !!value;

  return (
    <>
      <Pressable
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 40,
          paddingHorizontal: 10,
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 8,
          opacity: disabled ? 0.4 : 1,
        }}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className="active:opacity-70"
      >
        <PretendardFont
          weight={active ? "semibold" : "regular"}
          style={{ fontSize: 12, color: active ? C.text : C.ter, flex: 1 }}
          numberOfLines={1}
        >
          {selected ? selected.name : label}
        </PretendardFont>
        <Feather name="chevron-down" size={12} color={C.ter} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide">
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: C.white,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "65%",
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <PretendardFont
                weight="bold"
                style={{ fontSize: 16, color: C.text }}
              >
                {label}
              </PretendardFont>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                className="active:opacity-60"
              >
                <Feather name="x" size={20} color={C.ter} />
              </Pressable>
            </View>
            <ScrollView>
              {[{ code: "", name: "전체" }, ...options].map((o) => (
                <Pressable
                  key={o.code || "__all__"}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: C.bg,
                    backgroundColor: o.code === value ? C.bg : "transparent",
                  }}
                  onPress={() => {
                    onSelect(o.code);
                    setOpen(false);
                  }}
                >
                  <PretendardFont
                    weight={o.code === value ? "semibold" : "regular"}
                    style={{
                      fontSize: 14,
                      color: o.code === "" ? C.ter : C.text,
                    }}
                  >
                    {o.name}
                  </PretendardFont>
                  {o.code !== "" && (
                    <PretendardFont style={{ fontSize: 12, color: C.ter }}>
                      {o.code}
                    </PretendardFont>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────
const getDefaultMarket = (date: string) => {
  const day = new Date(date + "T09:00:00+09:00").getDay();
  return day === 0 ? "" : "110001";
};

const moveDateBy = (date: string, delta: number): string => {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + delta);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
};

const getMinDateKST = () => moveDateBy(getTodayKST(), -7);

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function FruitPriceScreen() {
  const router = useRouter();
  const { toastState, show: showToast, hide: hideToast } = useToast();
  const { isScrolled, onScroll, scrollEventThrottle } = useScrollHeader();

  const [marketCode, setMarketCode] = useState(() =>
    getDefaultMarket(getTodayKST()),
  );
  const [largeCode, setLargeCode] = useState("");
  const [middleCode, setMiddleCode] = useState("");
  const [smallCode, setSmallCode] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayKST());
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [quickItem, setQuickItem] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { fetchMarket, fetchByMiddle, invalidate, loading, error, cache } =
    useTradeStore();

  const cacheKey = quickItem
    ? `${middleKey(quickItem)}_${selectedDate}_${marketCode}`
    : `${marketCode}_${selectedDate}`;

  const isLoading = loading[cacheKey] ?? false;
  const errorMsg = error[cacheKey] ?? null;
  const rows = cache[cacheKey]?.rows ?? EMPTY_ROWS;

  useEffect(() => {
    if (quickItem) fetchByMiddle(quickItem, selectedDate, marketCode);
    else fetchMarket(marketCode, selectedDate);
  }, [cacheKey]);

  const handleSelectInterestMarket = useCallback(
    (item: InterestMarket) => {
      setMarketCode(item.marketCode);
      setLargeCode(item.cropMajorCode);
      const midRow = rows.find((r) => r.gds_mclsf_nm === item.cropMidName);
      const smallRow = rows.find((r) => r.gds_sclsf_nm === item.cropMinorName);
      setMiddleCode(midRow?.gds_mclsf_cd ?? "");
      setSmallCode(smallRow?.gds_sclsf_cd ?? "");
      setQuickItem(null);
      setPage(1);
    },
    [rows],
  );

  const handleDateChange = useCallback(
    (date: string) => {
      if (date > getTodayKST()) return;
      if (date < getMinDateKST()) {
        showToast("최근 7일 이내 데이터만 조회할 수 있어요.", "error");
        return;
      }
      setSelectedDate(date);
      setMarketCode(getDefaultMarket(date));
      setLargeCode("");
      setMiddleCode("");
      setSmallCode("");
      setPage(1);
    },
    [showToast],
  );

  const handleMarketChange = useCallback((code: string) => {
    setMarketCode(code);
    setLargeCode("");
    setMiddleCode("");
    setSmallCode("");
    setPage(1);
  }, []);

  const handleQuickItem = useCallback((name: string) => {
    setQuickItem((p) => (p === name ? null : name));
    setLargeCode("");
    setMiddleCode("");
    setSmallCode("");
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    invalidate(cacheKey);
    if (quickItem) fetchByMiddle(quickItem, selectedDate, marketCode);
    else fetchMarket(marketCode, selectedDate);
  }, [cacheKey, quickItem, selectedDate, marketCode]);

  const handlePullRefresh = useCallback(async () => {
    handleRefresh();
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
  }, [handleRefresh]);

  const currentMidName = useMemo(
    () => rows.find((r) => r.gds_mclsf_cd === middleCode)?.gds_mclsf_nm ?? "",
    [rows, middleCode],
  );
  const currentMinorName = useMemo(
    () => rows.find((r) => r.gds_sclsf_cd === smallCode)?.gds_sclsf_nm ?? "",
    [rows, smallCode],
  );

  const largeOptions = useMemo(() => getLargeOptions(rows), [rows]);
  const middleOptions = useMemo(
    () => getMiddleOptions(rows, largeCode),
    [rows, largeCode],
  );
  const smallOptions = useMemo(
    () => getSmallOptions(rows, middleCode),
    [rows, middleCode],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!largeCode || r.gds_lclsf_cd === largeCode) &&
          (!middleCode || r.gds_mclsf_cd === middleCode) &&
          (!smallCode || r.gds_sclsf_cd === smallCode),
      ),
    [rows, largeCode, middleCode, smallCode],
  );

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortKey),
    [filteredRows, sortKey],
  );
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / NUM_OF_ROWS));
  const pagedRows = sortedRows.slice(
    (page - 1) * NUM_OF_ROWS,
    page * NUM_OF_ROWS,
  );

  const atMinDate = selectedDate <= getMinDateKST();
  const atMaxDate = selectedDate >= getTodayKST();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <AppHeader
          title="도매시장 시세"
          onBack={() => router.back()}
          isScrolled={isScrolled}
        />

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: HEADER_HEIGHT + 16,
            paddingBottom: 24,
            gap: 16,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handlePullRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
        >
          {/* ── Card 1: 내 맞춤 시세 ── */}
          <Card style={{ padding: 0, overflow: "hidden" }} delay={0}>
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <PageTitle size="medium" title="내 맞춤 시세" />
            </View>
            <InterestMarketSection
              currentMarketCode={marketCode}
              currentLargeCode={largeCode}
              currentMidName={currentMidName}
              currentMinorName={currentMinorName}
              onSelectMarket={handleSelectInterestMarket}
              onShowToast={showToast}
            />
          </Card>

          {/* ── Card 2: 도매시장 시세 설정 ── */}
          <Card style={{ padding: 0, overflow: "hidden" }} delay={100}>
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <PageTitle size="medium" title="도매시장 시세" />
            </View>

            {/* 날짜 + 새로고침 */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: C.bg,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
              >
                <Pressable
                  onPress={() => handleDateChange(moveDateBy(selectedDate, -1))}
                  hitSlop={16}
                  style={{ padding: 6, opacity: atMinDate ? 0.3 : 1 }}
                >
                  <Feather name="chevron-left" size={22} color={C.text} />
                </Pressable>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <PretendardFont
                    weight="bold"
                    style={{ fontSize: 17, color: C.primary }}
                  >
                    {selectedDate}
                  </PretendardFont>
                </Pressable>
                <Pressable
                  onPress={() => handleDateChange(moveDateBy(selectedDate, 1))}
                  hitSlop={16}
                  style={{ padding: 6, opacity: atMaxDate ? 0.3 : 1 }}
                >
                  <Feather name="chevron-right" size={22} color={C.text} />
                </Pressable>
              </View>

              <Pressable
                onPress={handleRefresh}
                disabled={isLoading}
                className="flex-row items-center gap-1.5 active:opacity-80"
                style={{
                  position: "absolute",
                  top: 12,
                  right: 16,
                  zIndex: 10,
                  backgroundColor: C.primary,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Feather name="refresh-cw" size={13} color={C.white} />
                )}

                <PretendardFont
                  weight="semibold"
                  style={{ fontSize: 12, color: C.white }}
                >
                  {isLoading ? "로딩중" : "새로고침"}
                </PretendardFont>
              </Pressable>
            </View>

            {/* 7일 안내 */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingBottom: 10,
                gap: 5,
              }}
            >
              <Feather name="info" size={11} color={C.ter} />
              <PretendardFont style={{ fontSize: 11, color: C.ter }}>
                최근 7일 이내 데이터만 제공돼요 ({getMinDateKST()} ~{" "}
                {getTodayKST()})
              </PretendardFont>
            </View>

            {/* 도매시장 선택 */}
            <FilterPanel
              marketCode={marketCode}
              onMarketChange={handleMarketChange}
            />

            {/* 대/중/소 분류 */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                paddingHorizontal: 16,
                paddingTop: 4,
                paddingBottom: 16,
                borderTopWidth: 1,
                borderTopColor: C.bg,
              }}
            >
              <ClassifyDropdown
                label="대분류"
                value={largeCode}
                options={largeOptions}
                onSelect={(c) => {
                  setLargeCode(c);
                  setMiddleCode("");
                  setSmallCode("");
                  setPage(1);
                }}
                disabled={!largeOptions.length}
              />
              <ClassifyDropdown
                label="중분류"
                value={middleCode}
                options={middleOptions}
                onSelect={(c) => {
                  setMiddleCode(c);
                  setSmallCode("");
                  setPage(1);
                }}
                disabled={!largeCode}
              />
              <ClassifyDropdown
                label="소분류"
                value={smallCode}
                options={smallOptions}
                onSelect={(c) => {
                  setSmallCode(c);
                  setPage(1);
                }}
                disabled={!middleCode}
              />
            </View>

            {/* DateTimePicker */}
            {showDatePicker && (
              <DateTimePicker
                value={new Date(selectedDate + "T09:00:00+09:00")}
                mode="date"
                display="calendar"
                minimumDate={new Date(getMinDateKST() + "T09:00:00+09:00")}
                maximumDate={new Date()}
                onChange={(_: any, date?: Date) => {
                  setShowDatePicker(false);
                  if (!date) return;
                  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
                  handleDateChange(kst.toISOString().slice(0, 10));
                }}
              />
            )}
          </Card>

          {/* ── Card 3: 조회 결과 ── */}
          <Card style={{ padding: 0, overflow: "hidden" }} delay={200}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: C.bg }}>
              <SortBar
                value={sortKey}
                onChange={(k) => {
                  setSortKey(k);
                  setPage(1);
                }}
              />
            </View>

            {/* 힌트 */}
            <PretendardFont
              style={{
                fontSize: 11,
                color: C.ter,
                textAlign: "center",
                paddingVertical: 6,
                backgroundColor: C.bg,
              }}
            >
              두 손가락으로 확대 · 행 탭하면 상세정보
            </PretendardFont>

            {/* 에러 */}
            {errorMsg && (
              <View
                style={{
                  margin: 12,
                  padding: 12,
                  backgroundColor: "#FEF2F2",
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#FECACA",
                }}
              >
                <PretendardFont style={{ color: "#DC2626", fontSize: 13 }}>
                  ⚠️ {errorMsg}
                </PretendardFont>
              </View>
            )}

            {/* 로딩/빈화면/테이블 */}
            {isLoading ? (
              <View
                style={{ paddingVertical: 60, alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator size="large" color={C.primary} />
                <PretendardFont style={{ color: C.ter, fontSize: 13 }}>
                  시세 불러오는 중…
                </PretendardFont>
              </View>
            ) : pagedRows.length > 0 ? (
              <ZoomableTable rows={pagedRows} onRowPress={setDetailRow} />
            ) : (
              !errorMsg && (
                <View
                  style={{ paddingVertical: 60, alignItems: "center", gap: 8 }}
                >
                  <Feather name="inbox" size={36} color={C.ter} />
                  <PretendardFont style={{ color: C.ter, fontSize: 14 }}>
                    조회된 데이터가 없습니다.
                  </PretendardFont>
                </View>
              )
            )}
          </Card>
        </ScrollView>

        {/* ── 하단 고정 바 ── */}
        <View
          style={{
            backgroundColor: C.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 1,
            borderTopColor: C.border,
            shadowColor: C.primary,
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.15,
            shadowRadius: 14,
            elevation: 8,
          }}
        >
          {/* 빠른 검색 */}
          <View
            style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                <PretendardFont
                  style={{ fontSize: 12, color: C.ter, marginRight: 2 }}
                >
                  빠른 검색
                </PretendardFont>
                {QUICK_SEARCH_ITEMS.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => handleQuickItem(name)}
                    className="active:opacity-80"
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: quickItem === name ? C.primary : C.bg,
                      borderWidth: 1,
                      borderColor: quickItem === name ? C.primary : C.border,
                    }}
                  >
                    <PretendardFont
                      weight="semibold"
                      style={{
                        fontSize: 13,
                        color: quickItem === name ? C.white : C.sec,
                      }}
                    >
                      {name}
                      {quickItem === name ? " ✕" : ""}
                    </PretendardFont>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 페이지네이션 */}
          {!isLoading && sortedRows.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderTopWidth: 1,
                borderTopColor: C.bg,
              }}
            >
              <PretendardFont style={{ color: C.ter, fontSize: 13 }}>
                총 {sortedRows.length.toLocaleString()}건
              </PretendardFont>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPage={(p) => {
                  if (!isLoading) setPage(p);
                }}
              />
            </View>
          )}
        </View>

        <Toast
          visible={toastState.visible}
          message={toastState.message}
          type={toastState.type}
          onHide={hideToast}
        />
      </View>

      <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </GestureHandlerRootView>
  );
}
