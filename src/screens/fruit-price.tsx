/*드롭다운, 모달, 테이블 확대 기능, 테이블, 페이지네이션 순으로 작성한 도매시장 시세 UI. 데이터는 useTradeStore에서 관리.*/
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
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
import { WHOLESALE_MARKETS } from "@/constants/fruit-price";
import {
  useTradeStore,
  getLargeOptions,
  getMiddleOptions,
  getSmallOptions,
} from "@/features/fruit-price";
import { type Row } from "@/types";
import {
  QUICK_SEARCH_ITEMS,
  middleKey,
  COLUMNS,
  DETAIL_FIELDS,
  getTodayKST,
} from "@/constants";
import Pagination from "@/components/pagination";
import AppHeader from "@/components/AppHeader";

const NUM_OF_ROWS = 30;
const BASE_FONT = 13; //시세 결과 테이블 기본 글자 크기
const MIN_SCALE = 1.0;
const MAX_SCALE = 3.0;

// 캐시 미스 시 매 렌더마다 새 [] 생성을 막기 위한 상수 — 무한루프 방지
const EMPTY_ROWS: Row[] = [];

// ─── Dropdown ────────────────────────────────────────────────────────────────

function Dropdown({
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

  return (
    <>
      <TouchableOpacity
        className={`flex-1 flex-row items-center justify-between h-10 px-3 bg-white border border-slate-200 rounded-lg ${disabled ? "opacity-40" : ""}`}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
      >
        <Text
          className="text-xs font-medium text-slate-700 flex-1"
          numberOfLines={1}
        >
          {selected ? selected.name : label}
        </Text>
        <Text className="text-slate-400 text-xs ml-1">▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setOpen(false)}
        >
          <Pressable className="bg-white rounded-t-3xl max-h-[65%] pb-8">
            <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <Text className="text-base font-bold text-slate-800">
                {label}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text className="text-slate-400 text-lg px-2">✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[{ code: "", name: "전체" }, ...options].map((o) => (
                <TouchableOpacity
                  key={o.code || "__all__"}
                  className={`flex-row items-center justify-between px-5 py-4 border-b border-slate-50 ${o.code === value ? "bg-blue-50" : ""}`}
                  onPress={() => {
                    onSelect(o.code);
                    setOpen(false);
                  }}
                >
                  <Text
                    className={`text-sm ${o.code === value ? "text-blue-600 font-semibold" : o.code === "" ? "text-slate-500" : "text-slate-700"}`}
                  >
                    {o.name}
                  </Text>
                  {o.code !== "" && (
                    <Text className="text-xs text-slate-400">{o.code}</Text>
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

// ─── DetailModal ──────────────────────────────────────────────────────────────

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
        className="flex-1 bg-black/50 justify-center px-4"
        onPress={onClose}
      >
        <Pressable className="bg-white rounded-2xl overflow-hidden">
          <View className="flex-row items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
            <Text className="text-base font-bold text-slate-800">
              상세 정보
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Text className="text-slate-400 text-xl">✕</Text>
            </TouchableOpacity>
          </View>
          <GHScrollView className="min-h-fit px-5 py-2">
            {DETAIL_FIELDS.filter(({ key }) => row[key]).map(
              ({ key, label }) => (
                <View
                  key={key}
                  className="flex-row py-2 border-b border-slate-50"
                >
                  <Text className="text-xs font-semibold text-slate-400 w-28">
                    {label}
                  </Text>
                  <Text className="text-sm text-slate-800 flex-1">
                    {key === "scsbd_prc"
                      ? `${Number(row[key]).toLocaleString("ko-KR")}원`
                      : row[key]}
                  </Text>
                </View>
              ),
            )}
          </GHScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── ZoomableTable ────────────────────────────────────────────────────────────

function ZoomableTable({
  rows,
  onRowPress,
}: {
  rows: Row[];
  onRowPress: (row: Row) => void;
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
          <View className="flex-row bg-slate-100 border-b-2 border-slate-300">
            {COLUMNS.map((col) => (
              <View
                key={col.key}
                style={{ width: col.baseWidth }}
                className="px-2 py-2 border-r border-slate-200"
              >
                <Text
                  style={{ fontSize: BASE_FONT - 1 }}
                  className="font-bold text-slate-500 text-center"
                >
                  {col.label}
                </Text>
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
                <View
                  key={col.key}
                  style={{ width: col.baseWidth }}
                  className="px-2 py-2 border-r border-slate-100 justify-center"
                >
                  <Text
                    style={{ fontSize: BASE_FONT }}
                    className={`text-center ${col.key === "scsbd_prc" ? "font-bold text-blue-600" : "text-slate-700"}`}
                    numberOfLines={1}
                  >
                    {col.key === "scsbd_prc"
                      ? Number(row[col.key]).toLocaleString("ko-KR")
                      : col.key === "scsbd_dt"
                        ? (row[col.key]?.split(" ")[1] ?? "—") // 시간만 표시
                        : row[col.key] || "—"}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>
    </GestureDetector>
  );
}

// ─── 메인 화면 ────────────────────────────────────────────────────────────────

// 특정 날짜가 일요일이면 전체(""), 아니면 서울가락
const getDefaultMarket = (date: string) => {
  const day = new Date(date + "T09:00:00+09:00").getDay();
  return day === 0 ? "" : "110001";
};

export default function ApiTestScreen() {
  const router = useRouter();
  const [marketCode, setMarketCode] = useState(() =>
    getDefaultMarket(getTodayKST()),
  );
  const [largeCode, setLargeCode] = useState("");
  const [middleCode, setMiddleCode] = useState("");
  const [smallCode, setSmallCode] = useState("");
  const [page, setPage] = useState(1);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [quickItem, setQuickItem] = useState<string | null>(null);

  // 날짜 선택 state — 기본값 오늘
  const [selectedDate, setSelectedDate] = useState(getTodayKST());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { fetchMarket, fetchByMiddle, invalidate, loading, error, cache } =
    useTradeStore();

  // 현재 활성 캐시 키 — 날짜 포함
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

  const handleMarketChange = (code: string) => {
    setMarketCode(code);
    setLargeCode("");
    setMiddleCode("");
    setSmallCode("");
    setPage(1);
  };

  const handleQuickItem = (name: string) => {
    setQuickItem((prev) => (prev === name ? null : name));
    setLargeCode("");
    setMiddleCode("");
    setSmallCode("");
    setPage(1);
  };

  const handleDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (!date) return;
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const next = kst.toISOString().slice(0, 10);
    setSelectedDate(next);
    setLargeCode("");
    setMiddleCode("");
    setMarketCode(getDefaultMarket(next)); // 날짜에 맞는 기본 시장으로
    setSmallCode("");
    setPage(1);
  };

  const moveDate = (delta: number) => {
    const [y, m, day] = selectedDate.split("-").map(Number);
    const d = new Date(y, m - 1, day + delta);
    const next = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    if (next > getTodayKST()) return;
    setMarketCode(getDefaultMarket(next)); // 날짜에 맞는 기본 시장으로
    setSelectedDate(next);
    setLargeCode("");
    setMiddleCode("");
    setSmallCode("");
    setPage(1);
  };

  const handleLargeChange = (code: string) => {
    setLargeCode(code);
    setMiddleCode("");
    setSmallCode("");
    setPage(1);
  };
  const handleMiddleChange = (code: string) => {
    setMiddleCode(code);
    setSmallCode("");
    setPage(1);
  };
  const handleSmallChange = (code: string) => {
    setSmallCode(code);
    setPage(1);
  };

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
        (r: Row) =>
          (!largeCode || r.gds_lclsf_cd === largeCode) &&
          (!middleCode || r.gds_mclsf_cd === middleCode) &&
          (!smallCode || r.gds_sclsf_cd === smallCode),
      ),
    [rows, largeCode, middleCode, smallCode],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / NUM_OF_ROWS));
  const pagedRows = filteredRows.slice(
    (page - 1) * NUM_OF_ROWS,
    page * NUM_OF_ROWS,
  );

  const handlePageChange = (next: number) => {
    if (next >= 1 && next <= totalPages && !isLoading) setPage(next);
  };

  return (
    <GestureHandlerRootView className="flex-1">
      <View className="flex-1 bg-slate-50">
        {/* 헤더 */}
        <AppHeader title="도매시장 시세" onBack={() => router.back()} />
        <View
          className="px-4 py-1.5"
          style={{ zIndex: 100 }} // 드롭다운이 헤더 아래로 가는 문제 방지
        >
          {/* 날짜 선택 — ◀ 날짜 ▶, 날짜 탭하면 캘린더 팝업 */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-2 mt-1 pl-3">
              <TouchableOpacity
                onPress={() => moveDate(-1)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // 작은 버튼이라 히트슬롭으로 터치 영역 확대
                className="w-7 h-7 items-center justify-center"
              >
                <Text className=" text-sm">◀</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                <Text className="text-sm font-semibold text-blue-500">{`${selectedDate}`}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => moveDate(1)}
                className={`w-7 h-7 items-center justify-center ${selectedDate >= getTodayKST() ? "opacity-30" : ""}`}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className=" text-sm">▶</Text>
              </TouchableOpacity>
            </View>
            <Text>시세는 일주일 단위로 확인 가능해요!</Text>
          </View>
        </View>

        {/* DatePicker — 버튼 탭 시 표시 */}
        {showDatePicker && (
          <DateTimePicker
            value={new Date(selectedDate)}
            mode="date"
            display="calendar"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        {/* 드롭다운 */}
        <View className="px-4 py-3 bg-white border-b border-slate-100 gap-2">
          <View className="flex-row items-center gap-2">
            <Dropdown
              label="도매시장 선택"
              value={marketCode}
              options={WHOLESALE_MARKETS.map((m) => ({
                code: m.code,
                name: m.name,
              }))}
              onSelect={handleMarketChange}
            />
            <TouchableOpacity
              className={`h-10 px-4 rounded-lg items-center justify-center bg-blue-600 ${isLoading ? "opacity-50" : ""}`}
              onPress={() => {
                invalidate(cacheKey);
                if (quickItem) fetchByMiddle(quickItem, selectedDate);
                else fetchMarket(marketCode, selectedDate);
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-semibold text-xs">
                  새로고침
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-2">
            <Dropdown
              label="대분류"
              value={largeCode}
              options={largeOptions}
              onSelect={handleLargeChange}
              disabled={rows.length === 0}
            />
            <Dropdown
              label="중분류"
              value={middleCode}
              options={middleOptions}
              onSelect={handleMiddleChange}
              disabled={!largeCode}
            />
            <Dropdown
              label="소분류"
              value={smallCode}
              options={smallOptions}
              onSelect={handleSmallChange}
              disabled={!middleCode}
            />
          </View>
        </View>

        <View className="px-4 py-1.5 bg-slate-100">
          <Text className="text-xs text-slate-400 text-center">
            두 손가락으로 확대 · 행 클릭 시 상세정보
          </Text>
        </View>

        {errorMsg && (
          <View className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-red-600 text-sm">{`⚠️ ${errorMsg}`}</Text>
          </View>
        )}

        {isLoading && (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-slate-400 text-sm">불러오는 중…</Text>
          </View>
        )}

        {!isLoading && pagedRows.length > 0 && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <ZoomableTable rows={pagedRows} onRowPress={setDetailRow} />
          </ScrollView>
        )}

        {!isLoading && !errorMsg && pagedRows.length === 0 && (
          <View className="flex-1 items-center justify-center">
            <Text className="text-slate-400 text-sm">
              조회된 데이터가 없습니다.
            </Text>
          </View>
        )}

        {!isLoading && filteredRows.length > 0 && (
          <View className="flex-row items-center justify-between px-4 py-2 bg-white border-t border-slate-200">
            <Text className="text-slate-400 text-sm">{`총 ${filteredRows.length.toLocaleString()}건`}</Text>
            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={handlePageChange}
            />
            <Text className="text-xs text-slate-400">{`${NUM_OF_ROWS}건/페이지`}</Text>
          </View>
        )}
      </View>

      <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />

      {/* 빠른검색 버튼 */}
      <View className="flex-row items-center gap-3 py-3">
        <Text className=" text-slate-400 ml-2">퀵 검색</Text>
        {QUICK_SEARCH_ITEMS.map((name) => (
          <TouchableOpacity
            key={name}
            className={`h-9 px-4 rounded-full border items-center justify-center ${quickItem === name ? "bg-orange-400 border-yellow-500" : "bg-white border-slate-200"}`}
            onPress={() => handleQuickItem(name)}
          >
            <View className="flex-row items-center gap-1">
              <Text
                className={` font-semibold ${quickItem === name ? "text-white" : "text-slate-700"}`}
              >
                {name}
              </Text>
              {quickItem === name && <Text className="text-white">[취소]</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </GestureHandlerRootView>
  );
}
