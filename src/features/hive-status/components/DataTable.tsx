import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { useHideFooterOnScroll } from "@/stores/useFooterVisibility";
import { PretendardFont } from "@/components/PretendardFont";
import type { DataPoint, HiveSensorDataKey, Period } from "@/types";
import { C } from "@/constants/hive-colors";

const COL_WIDTH = 76;

// 소수 둘째 자리 이하가 그대로 오는 값도 있어 표에서는 자리수를 맞춰 보여줍니다.
const oneDecimal = (value: number) => value.toFixed(1);
const whole = (value: number) => String(Math.round(value));

const TABLE_COLS: Array<{
  key: HiveSensorDataKey;
  label: string;
  unit: string;
  color: string;
  format: (value: number) => string;
}> = [
  {
    key: "internalTemperature",
    label: "내부 온도",
    unit: "°C",
    color: C.text,
    format: oneDecimal,
  },
  {
    key: "externalTemperature",
    label: "기계 온도",
    unit: "°C",
    color: C.text,
    format: oneDecimal,
  },
  {
    key: "internalHumidity",
    label: "내부 습도",
    unit: "%",
    color: C.text,
    format: whole,
  },
  {
    key: "externalHumidity",
    label: "기계 습도",
    unit: "%",
    color: C.text,
    format: whole,
  },
  // CO2는 센서 미장착으로 항상 null이라 표에서 뺍니다.
  {
    key: "targetTemperature",
    label: "목표 온도",
    unit: "°C",
    color: C.text,
    format: oneDecimal,
  },
  {
    key: "peltierDutyPct",
    label: "펠티어 출력",
    unit: "%",
    color: C.text,
    format: whole,
  },
  {
    key: "fanHotDutyPct",
    label: "고온측 팬",
    unit: "%",
    color: C.text,
    format: whole,
  },
  {
    key: "fanColdDutyPct",
    label: "저온측 팬",
    unit: "%",
    color: C.text,
    format: whole,
  },
  {
    // 필드명은 ...CurrentA지만 펌웨어가 보내는 값은 냉방측 IS 핀 ADC 전압(mV)입니다.
    key: "peltierCoolCurrentA",
    label: "냉각측 IS",
    unit: "mV",
    color: C.text,
    format: whole,
  },
  {
    key: "peltierHeatCurrentA",
    label: "가열측 IS",
    unit: "mV",
    color: C.text,
    format: whole,
  },
];

const STATUS_COLS: Array<{
  key: "peltierMode" | "fanState" | "internalSensorValid" | "externalSensorValid";
  label: string;
  format: (point: DataPoint) => string;
}> = [
  { key: "peltierMode", label: "펠티어 모드", format: (point) => point.peltierMode ?? "-" },
  { key: "fanState", label: "팬 상태", format: (point) => point.fanState ?? "-" },
  {
    key: "internalSensorValid",
    label: "내부 센서",
    format: (point) =>
      point.internalSensorValid == null ? "-" : point.internalSensorValid ? "정상" : "점검 필요",
  },
  {
    key: "externalSensorValid",
    label: "기계 센서",
    format: (point) =>
      point.externalSensorValid == null ? "-" : point.externalSensorValid ? "정상" : "점검 필요",
  },
];

interface DataTableProps {
  data: DataPoint[];
  period: Period;
  /** 지정하면 표 안에서 세로로 스크롤하고, 항목 이름 행(위)과 시간 열(왼쪽)이 고정됩니다. */
  stickyHeaderMaxHeight?: number;
}

export function DataTable({ data, period, stickyHeaderMaxHeight }: DataTableProps) {
  const periodLabel =
    period === "일간" ? "시간" : period === "주간" ? "요일" : "주차";

  if (stickyHeaderMaxHeight) {
    return <FrozenTable data={data} periodLabel={periodLabel} maxHeight={stickyHeaderMaxHeight} />;
  }

  const header = (
    <View
      key="header"
      className="mb-1 flex-row pb-3"
      style={{
        borderBottomWidth: 2,
        borderBottomColor: C.border,
      }}
    >
      <View className="w-[68px] pl-1">
        <PretendardFont
          weight="bold"
          style={{ fontSize: 14, color: "#191F28" }}
        >
          {periodLabel}
        </PretendardFont>
      </View>
      {TABLE_COLS.map((col) => (
        <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center" }}>
          <PretendardFont
            weight="bold"
            style={{ fontSize: 12, color: col.color, textAlign: "center" }}
            numberOfLines={2}
          >
            {col.label}
          </PretendardFont>
          <PretendardFont
            style={{ fontSize: 11, color: C.sec, marginTop: 2 }}
          >
            {col.unit}
          </PretendardFont>
        </View>
      ))}
      {STATUS_COLS.map((col) => (
        <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center" }}>
          <PretendardFont
            weight="bold"
            style={{ fontSize: 12, color: C.text, textAlign: "center" }}
            numberOfLines={2}
          >
            {col.label}
          </PretendardFont>
        </View>
      ))}
    </View>
  );

  const rows = data.map((point, index) => (
      <View
        key={`${point.label}-${index}`}
        className="flex-row flex-wrap"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          backgroundColor: index % 2 === 0 ? C.bgAlt : C.white,
          paddingVertical: 10,
          width: 68 + COL_WIDTH * (TABLE_COLS.length + STATUS_COLS.length),
        }}
      >
        <View className="w-[68px] justify-center pl-1">
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 14, color: C.text }}
          >
            {point.label}
          </PretendardFont>
        </View>
        {TABLE_COLS.map((col) => (
          <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center", justifyContent: "center" }}>
            <PretendardFont
              weight="medium"
              style={{ fontSize: 13, color: C.text }}
            >
              {point.hasData !== false &&
              typeof point[col.key] === "number" &&
              Number.isFinite(point[col.key])
                ? col.format(point[col.key] as number)
                : "—"}
            </PretendardFont>
          </View>
        ))}
        {STATUS_COLS.map((col) => (
          <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center", justifyContent: "center" }}>
            <PretendardFont
              weight="medium"
              numberOfLines={1}
              style={{ fontSize: 12, color: C.text, textAlign: "center" }}
            >
              {col.format(point)}
            </PretendardFont>
          </View>
        ))}
        {point.issues?.map((issue) => (
          <PretendardFont
            key={JSON.stringify([issue.code, issue.timestamp])}
            style={{ width: "100%", paddingHorizontal: 4, marginTop: 6, fontSize: 12, color: C.error }}
          >
            장치 점검 · {issue.code}
            {issue.timestamp ? ` · ${issue.timestamp === "UNSYNCED_BOOT" ? "기기 시간 동기화 전" : issue.timestamp}` : ""}
          </PretendardFont>
        ))}
      </View>
  ));

  return (
    <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator>
      <View>
        {header}
        {rows}
      </View>
    </ScrollView>
  );
}

const TIME_W = 68;
// 한 번에 그리는 행 수. 10초 간격은 1시간에 360행이라 나눠 그려야 화면이 멈추지 않습니다.
const ROW_BATCH = 50;
const ROW_H = 44;
const HEAD_H = 56;

const issueLabel = (point: DataPoint) =>
  point.issues?.length ? point.issues.map((issue) => issue.code).join(", ") : "-";

/**
 * 항목 이름 행(위)과 시간 열(왼쪽)을 고정한 표.
 * - 세로로 내리면 머리행이 위에 붙어 있고, 좌우로 밀면 시간 열은 그대로 남습니다.
 * - 머리행 가로 위치는 본문 가로 스크롤을 따라 맞춥니다. 행 높이는 고정해 두 열이 어긋나지 않게 합니다.
 * - 고정 머리행은 ScrollView가 바깥 래퍼로 스타일을 옮기고 안쪽 스타일을 지웁니다(가로 배치가 풀려 열이 밀림).
 *   그래서 스타일 없는 View로 한 번 감싸 실제 머리행의 가로 배치를 지킵니다.
 */
function FrozenTable({ data, periodLabel, maxHeight }: { data: DataPoint[]; periodLabel: string; maxHeight: number }) {
  const headerScrollRef = useRef<ScrollViewInstance>(null);
  const [visibleCount, setVisibleCount] = useState(ROW_BATCH);
  // 표 안을 스크롤할 때도 화면 스크롤처럼 하단 탭바를 숨기고 보여줍니다.
  const footerScroll = useHideFooterOnScroll();
  // 다른 기록으로 바뀌면 다시 앞부분만 그립니다.
  useEffect(() => setVisibleCount(ROW_BATCH), [data]);
  const rows = data.slice(0, visibleCount);
  const columnsWidth = COL_WIDTH * (TABLE_COLS.length + STATUS_COLS.length + 1);
  const rowBg = (index: number) => (index % 2 === 0 ? C.bgAlt : C.white);

  return (
    <ScrollView
      nestedScrollEnabled
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator
      scrollEventThrottle={32}
      onScroll={(event) => {
        footerScroll.onScroll(event);
        const { nativeEvent } = event;
        // 끝에서 몇 행 남았을 때 다음 묶음을 그립니다.
        const remaining = nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
        if (remaining < ROW_H * 10 && visibleCount < data.length) setVisibleCount((count) => count + ROW_BATCH);
      }}
      style={{ maxHeight }}
    >
      <View>
        <View style={{ flexDirection: "row", height: HEAD_H, backgroundColor: C.white, borderBottomWidth: 2, borderBottomColor: C.border }}>
          <View style={{ width: TIME_W, justifyContent: "center", paddingLeft: 4, borderRightWidth: 1, borderRightColor: C.border }}>
            <PretendardFont weight="bold" style={{ fontSize: 14, color: C.text }}>{periodLabel}</PretendardFont>
          </View>
          <ScrollView ref={headerScrollRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", width: columnsWidth, alignItems: "center" }}>
              {TABLE_COLS.map((col) => (
                <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center" }}>
                  <PretendardFont weight="bold" numberOfLines={2} style={{ fontSize: 12, color: C.text, textAlign: "center" }}>{col.label}</PretendardFont>
                  <PretendardFont style={{ fontSize: 11, color: C.sec, marginTop: 2 }}>{col.unit}</PretendardFont>
                </View>
              ))}
              {STATUS_COLS.map((col) => (
                <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center" }}>
                  <PretendardFont weight="bold" numberOfLines={2} style={{ fontSize: 12, color: C.text, textAlign: "center" }}>{col.label}</PretendardFont>
                </View>
              ))}
              <View style={{ width: COL_WIDTH, alignItems: "center" }}>
                <PretendardFont weight="bold" style={{ fontSize: 12, color: C.text }}>장치 점검</PretendardFont>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={{ flexDirection: "row" }}>
        <View style={{ width: TIME_W, borderRightWidth: 1, borderRightColor: C.border }}>
          {rows.map((point, index) => (
            <View
              key={`${point.label}-${index}`}
              style={{ height: ROW_H, justifyContent: "center", paddingLeft: 4, backgroundColor: rowBg(index), borderBottomWidth: 1, borderBottomColor: C.border }}
            >
              <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.text, fontVariant: ["tabular-nums"] }}>{point.label}</PretendardFont>
            </View>
          ))}
        </View>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          scrollEventThrottle={16}
          onScroll={(event) => headerScrollRef.current?.scrollTo({ x: event.nativeEvent.contentOffset.x, animated: false })}
          style={{ flex: 1 }}
        >
          <View style={{ width: columnsWidth }}>
            {rows.map((point, index) => (
              <View
                key={`${point.label}-${index}`}
                style={{ height: ROW_H, flexDirection: "row", alignItems: "center", backgroundColor: rowBg(index), borderBottomWidth: 1, borderBottomColor: C.border }}
              >
                {TABLE_COLS.map((col) => (
                  <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center" }}>
                    <PretendardFont weight="medium" style={{ fontSize: 13, color: C.text, fontVariant: ["tabular-nums"] }}>
                      {point.hasData !== false && typeof point[col.key] === "number" && Number.isFinite(point[col.key])
                        ? col.format(point[col.key] as number)
                        : "—"}
                    </PretendardFont>
                  </View>
                ))}
                {STATUS_COLS.map((col) => (
                  <View key={col.key} style={{ width: COL_WIDTH, alignItems: "center" }}>
                    <PretendardFont weight="medium" numberOfLines={1} style={{ fontSize: 12, color: C.text }}>{col.format(point)}</PretendardFont>
                  </View>
                ))}
                <View style={{ width: COL_WIDTH, alignItems: "center" }}>
                  <PretendardFont weight="medium" numberOfLines={1} style={{ fontSize: 12, color: point.issues?.length ? C.error : C.text }}>
                    {issueLabel(point)}
                  </PretendardFont>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}
