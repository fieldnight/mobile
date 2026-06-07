import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  View,
  TouchableOpacity,
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
import { middleKey, COLUMNS, DETAIL_FIELDS, getTodayKST, QUICK_SEARCH_ITEMS } from "@/constants";
import Pagination from "@/components/pagination";
import AppHeader from "@/components/AppHeader";
import { useScrollHeader, HEADER_HEIGHT } from "@/hooks";
import { Toast, useToast } from "@/components/Toast";
import { SortBar, sortRows, type SortKey } from "@/components/SortBar";
import { PretendardFont } from "@/components/PretendardFont";
import { InterestMarketSection } from "./InterestMarketSection";
import { FilterPanel } from "./FilterPanel";

const NUM_OF_ROWS = 30;
const BASE_FONT = 13;
const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;
const EMPTY_ROWS: Row[] = [];

// ── DetailModal ───────────────────────────────────────────────────────────────
function DetailModal({ row, onClose }: { row: Row | null; onClose: () => void }) {
  if (!row) return null;
  return (
    <Modal transparent>
      <Pressable className="flex-1 bg-black/50 justify-center px-4" onPress={onClose}>
        <Pressable className="bg-white rounded-2xl overflow-hidden">
          <View className="flex-row items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
            <PretendardFont weight="bold" style={{ fontSize: 16, color: "#1E293B" }}>
              상세 정보
            </PretendardFont>
            <TouchableOpacity onPress={onClose} className="p-1">
              <PretendardFont style={{ color: "#94A3B8", fontSize: 20 }}>✕</PretendardFont>
            </TouchableOpacity>
          </View>
          <GHScrollView className="min-h-fit px-5 py-2">
            {DETAIL_FIELDS.filter(({ key }) => row[key]).map(({ key, label }) => (
              <View key={key} className="flex-row py-2 border-b border-slate-50">
                <PretendardFont weight="semibold" style={{ fontSize: 12, color: "#94A3B8", width: 112 }}>
                  {label}
                </PretendardFont>
                <PretendardFont style={{ fontSize: 14, color: "#1E293B", flex: 1 }}>
                  {key === "scsbd_prc" ? `${Number(row[key]).toLocaleString("ko-KR")}원` : row[key]}
                </PretendardFont>
              </View>
            ))}
          </GHScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── ZoomableTable ─────────────────────────────────────────────────────────────
function ZoomableTable({ rows, onRowPress }: { rows: Row[]; onRowPress: (r: Row) => void }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE); })
    .onEnd(() => { savedScale.value = scale.value; });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    transformOrigin: "top left",
  }));

  return (
    <GestureDetector gesture={pinchGesture}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Animated.View style={animatedStyle}>
          <View className="flex-row bg-slate-100 border-b-2 border-slate-300">
            {COLUMNS.map((col) => (
              <View key={col.key} style={{ width: col.baseWidth }} className="px-2 py-2 border-r border-slate-200">
                <PretendardFont
                  weight="bold"
                  style={{ fontSize: BASE_FONT - 1, color: "#64748B", textAlign: "center" }}
                >
                  {col.label}
                </PretendardFont>
              </View>
            ))}
          </View>
          {rows.map((row, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => onRowPress(row)}
              className={`flex-row border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
            >
              {COLUMNS.map((col) => (
                <View key={col.key} style={{ width: col.baseWidth }} className="px-2 py-2 border-r border-slate-100 justify-center">
                  <PretendardFont
                    weight={col.key === "scsbd_prc" ? "bold" : "regular"}
                    style={{
                      fontSize: BASE_FONT,
                      textAlign: "center",
                      color: col.key === "scsbd_prc" ? "#2563EB" : "#334155",
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
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </GestureDetector>
  );
}

// ── 대/중/소 드롭다운 ─────────────────────────────────────────────────────────
function ClassifyDropdown({
  label, value, options, onSelect, disabled = false,
}: {
  label: string;
  value: string;
  options: { code: string; name: string }[];
  onSelect: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.code === value);

  return (
    <>
      <TouchableOpacity
        style={{
          flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          height: 40, paddingHorizontal: 10, backgroundColor: "#fff",
          borderWidth: 1, borderColor: value ? "#2563EB" : "#E2E8F0",
          borderRadius: 8, opacity: disabled ? 0.4 : 1,
        }}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <PretendardFont
          weight={value ? "semibold" : "regular"}
          style={{ fontSize: 12, color: value ? "#2563EB" : "#94A3B8", flex: 1 }}
          numberOfLines={1}
        >
          {selected ? selected.name : label}
        </PretendardFont>
        <PretendardFont style={{ color: value ? "#2563EB" : "#94A3B8", fontSize: 11 }}>▾</PretendardFont>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
          onPress={() => setOpen(false)}
        >
          <Pressable style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "65%", paddingBottom: 32 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
              <PretendardFont weight="bold" style={{ fontSize: 16, color: "#1E293B" }}>{label}</PretendardFont>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <PretendardFont style={{ color: "#94A3B8", fontSize: 18, paddingHorizontal: 8 }}>✕</PretendardFont>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[{ code: "", name: "전체" }, ...options].map((o) => (
                <TouchableOpacity
                  key={o.code || "__all__"}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 20, paddingVertical: 16,
                    borderBottomWidth: 1, borderBottomColor: "#F8FAFC",
                    backgroundColor: o.code === value ? "#EFF6FF" : "transparent",
                  }}
                  onPress={() => { onSelect(o.code); setOpen(false); }}
                >
                  <PretendardFont
                    weight={o.code === value ? "semibold" : "regular"}
                    style={{ fontSize: 14, color: o.code === value ? "#2563EB" : o.code === "" ? "#94A3B8" : "#334155" }}
                  >
                    {o.name}
                  </PretendardFont>
                  {o.code !== "" && (
                    <PretendardFont style={{ fontSize: 12, color: "#CBD5E1" }}>{o.code}</PretendardFont>
                  )}
                </TouchableOpacity>
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

  const [marketCode, setMarketCode] = useState(() => getDefaultMarket(getTodayKST()));
  const [largeCode, setLargeCode] = useState("");
  const [middleCode, setMiddleCode] = useState("");
  const [smallCode, setSmallCode] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayKST());
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [quickItem, setQuickItem] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { fetchMarket, fetchByMiddle, invalidate, loading, error, cache } = useTradeStore();

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

  const handleDateChange = useCallback((date: string) => {
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
  }, [showToast]);

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
  const middleOptions = useMemo(() => getMiddleOptions(rows, largeCode), [rows, largeCode]);
  const smallOptions = useMemo(() => getSmallOptions(rows, middleCode), [rows, middleCode]);

  const filteredRows = useMemo(
    () => rows.filter(
      (r) =>
        (!largeCode || r.gds_lclsf_cd === largeCode) &&
        (!middleCode || r.gds_mclsf_cd === middleCode) &&
        (!smallCode || r.gds_sclsf_cd === smallCode),
    ),
    [rows, largeCode, middleCode, smallCode],
  );

  const sortedRows = useMemo(() => sortRows(filteredRows, sortKey), [filteredRows, sortKey]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / NUM_OF_ROWS));
  const pagedRows = sortedRows.slice((page - 1) * NUM_OF_ROWS, page * NUM_OF_ROWS);

  const atMinDate = selectedDate <= getMinDateKST();
  const atMaxDate = selectedDate >= getTodayKST();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
        <AppHeader title="도매시장 시세" onBack={() => router.back()} isScrolled={isScrolled} />

        {/* ── 메인 스크롤 영역 ── */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handlePullRefresh}
              tintColor="#EA580C"
              progressBackgroundColor="#FFFFFF"
              colors={["#EA580C", "#F59E0B"]}
            />
          }
        >

          {/* ── 내 맞춤 시세 패널 ── */}
          <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9", paddingTop: HEADER_HEIGHT }}>
            {/* 헤더: 설명글 + 토글 */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <PretendardFont weight="bold" style={{ fontSize: 17, color: "#1E293B" }}>내 맞춤 시세</PretendardFont>
                <PretendardFont style={{ fontSize: 13, color: "#64748B", marginTop: 4, lineHeight: 20 }}>
                  {"자주 보는 도매시장·작물 조합을 저장하고\n카드 탭 한 번으로 바로 시세를 확인해요"}
                </PretendardFont>
              </View>
              <TouchableOpacity
                onPress={() => setPanelCollapsed((p) => !p)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: panelCollapsed ? "#EFF6FF" : "#F1F5F9",
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 1, borderColor: panelCollapsed ? "#BFDBFE" : "#E2E8F0",
                }}
              >
                <Feather
                  name={panelCollapsed ? "chevron-down" : "chevron-up"}
                  size={15}
                  color={panelCollapsed ? "#2563EB" : "#64748B"}
                />
                <PretendardFont weight="semibold" style={{ fontSize: 14, color: panelCollapsed ? "#2563EB" : "#64748B" }}>
                  {panelCollapsed ? "맞춤 시세 열기" : "맞춤 시세 닫기"}
                </PretendardFont>
              </TouchableOpacity>
            </View>

            {/* 접히는 영역 */}
            {!panelCollapsed && (
              <InterestMarketSection
                currentMarketCode={marketCode}
                currentLargeCode={largeCode}
                currentMidName={currentMidName}
                currentMinorName={currentMinorName}
                onSelectMarket={handleSelectInterestMarket}
                onShowToast={showToast}
              />
            )}
          </View>

          {/* ── 도매시장 시세 섹션 ── */}
          <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
            {/* 제목 + 설명 */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <PretendardFont weight="bold" style={{ fontSize: 17, color: "#1E293B" }}>도매시장 시세</PretendardFont>
              <PretendardFont style={{ fontSize: 13, color: "#64748B", marginTop: 4, lineHeight: 20 }}>
                {"전국 도매시장의 농산물 낙찰 시세를 날짜별로 확인할 수 있어요.\n도매시장과 품목을 선택하면 원하는 작물의 시세를 바로 볼 수 있어요."}
              </PretendardFont>
            </View>

            {/* 날짜 + 새로고침 */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                <TouchableOpacity
                  onPress={() => handleDateChange(moveDateBy(selectedDate, -1))}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 10 }}
                  style={{ padding: 8, opacity: atMinDate ? 0.3 : 1 }}
                >
                  <PretendardFont style={{ fontSize: 22, color: "#334155" }}>◀</PretendardFont>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                  <PretendardFont weight="bold" style={{ fontSize: 18, color: "#2563EB" }}>{selectedDate}</PretendardFont>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDateChange(moveDateBy(selectedDate, 1))}
                  hitSlop={{ top: 16, bottom: 16, left: 10, right: 16 }}
                  style={{ padding: 8, opacity: atMaxDate ? 0.3 : 1 }}
                >
                  <PretendardFont style={{ fontSize: 22, color: "#334155" }}>▶</PretendardFont>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={isLoading}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: "#BFDBFE", opacity: isLoading ? 0.5 : 1 }}
              >
                {isLoading
                  ? <ActivityIndicator size="small" color="#3B82F6" />
                  : <Feather name="refresh-cw" size={15} color="#3B82F6" />}
                <PretendardFont weight="semibold" style={{ fontSize: 14, color: "#3B82F6" }}>
                  {isLoading ? "로딩중" : "새로고침"}
                </PretendardFont>
              </TouchableOpacity>
            </View>

            {/* 7일 제한 안내 */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Feather name="info" size={11} color="#94A3B8" />
              <PretendardFont style={{ fontSize: 11, color: "#94A3B8" }}>
                최근 7일 이내 데이터만 제공돼요 ({getMinDateKST()} ~ {getTodayKST()})
              </PretendardFont>
            </View>

            {/* 도매시장 선택 */}
            <FilterPanel marketCode={marketCode} onMarketChange={handleMarketChange} />

            {/* 대/중/소 분류 */}
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
              <ClassifyDropdown
                label="대분류" value={largeCode} options={largeOptions}
                onSelect={(c) => { setLargeCode(c); setMiddleCode(""); setSmallCode(""); setPage(1); }}
                disabled={!largeOptions.length}
              />
              <ClassifyDropdown
                label="중분류" value={middleCode} options={middleOptions}
                onSelect={(c) => { setMiddleCode(c); setSmallCode(""); setPage(1); }}
                disabled={!largeCode}
              />
              <ClassifyDropdown
                label="소분류" value={smallCode} options={smallOptions}
                onSelect={(c) => { setSmallCode(c); setPage(1); }}
                disabled={!middleCode}
              />
            </View>
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

          {/* 정렬 바 */}
          <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
            <SortBar value={sortKey} onChange={(k) => { setSortKey(k); setPage(1); }} />
          </View>

          <PretendardFont style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", paddingVertical: 6, backgroundColor: "#F1F5F9" }}>
            두 손가락으로 확대 · 행 탭하면 상세정보
          </PretendardFont>

          {errorMsg && (
            <View style={{ margin: 12, padding: 12, backgroundColor: "#FEF2F2", borderRadius: 10, borderWidth: 1, borderColor: "#FECACA" }}>
              <PretendardFont style={{ color: "#DC2626", fontSize: 13 }}>⚠️ {errorMsg}</PretendardFont>
            </View>
          )}

          {isLoading ? (
            <View style={{ paddingVertical: 60, alignItems: "center", justifyContent: "center", gap: 8 }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <PretendardFont style={{ color: "#94A3B8", fontSize: 13 }}>시세 불러오는 중…</PretendardFont>
            </View>
          ) : pagedRows.length > 0 ? (
            <ZoomableTable rows={pagedRows} onRowPress={setDetailRow} />
          ) : (
            !errorMsg && (
              <View style={{ paddingVertical: 60, alignItems: "center", justifyContent: "center" }}>
                <PretendardFont style={{ color: "#94A3B8", fontSize: 14 }}>조회된 데이터가 없습니다.</PretendardFont>
              </View>
            )
          )}

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* ── 하단 고정 바: 빠른 검색 + 페이지네이션 ── */}
        <View style={{ backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
          {/* 빠른 검색 */}
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <PretendardFont style={{ fontSize: 12, color: "#94A3B8", marginRight: 2 }}>빠른 검색</PretendardFont>
                {QUICK_SEARCH_ITEMS.map((name) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => handleQuickItem(name)}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
                      backgroundColor: quickItem === name ? "#F59E0B" : "#F8FAFC",
                      borderWidth: 1, borderColor: quickItem === name ? "#F59E0B" : "#E2E8F0",
                    }}
                  >
                    <PretendardFont weight="semibold" style={{ fontSize: 13, color: quickItem === name ? "#fff" : "#475569" }}>
                      {name}{quickItem === name ? " ✕" : ""}
                    </PretendardFont>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 페이지네이션 */}
          {!isLoading && sortedRows.length > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" }}>
              <PretendardFont style={{ color: "#94A3B8", fontSize: 13 }}>총 {sortedRows.length.toLocaleString()}건</PretendardFont>
              <Pagination page={page} totalPages={totalPages} onPage={(p) => { if (!isLoading) setPage(p); }} />
              <PretendardFont style={{ fontSize: 11, color: "#94A3B8" }}>{NUM_OF_ROWS}건/페이지</PretendardFont>
            </View>
          )}
        </View>

        <Toast visible={toastState.visible} message={toastState.message} type={toastState.type} onHide={hideToast} />
      </View>

      <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />
    </GestureHandlerRootView>
  );
}
