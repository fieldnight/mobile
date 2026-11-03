/**
 * 시세 테이블 정렬 바
 */

import { ScrollView } from "react-native";
import { PretendardFont } from "@/components/PretendardFont";
import { Tap } from "@/components/Tap";
import { C } from "@/constants/hive-colors";

export type SortKey =
  | "default"
  | "price_desc"
  | "price_asc"
  | "qty_desc"
  | "qty_asc";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "최신순" },
  { key: "price_desc", label: "높은 가격" },
  { key: "price_asc", label: "낮은 가격" },
  { key: "qty_desc", label: "거래 많은" },
  { key: "qty_asc", label: "거래 적은" },
];

interface SortBarProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
}

/** 글자만 있는 정렬 탭. 선택된 항목만 진하게 보여 칩 테두리·배경색이 글자를 가리지 않게 합니다. */
export function SortBar({ value, onChange }: SortBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4 }}
    >
      {SORT_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <Tap
            key={opt.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => ({
              paddingHorizontal: 8,
              paddingVertical: 8,
              borderRadius: 6,
              backgroundColor: pressed ? C.bgAlt : "transparent",
            })}
          >
            <PretendardFont
              weight={active ? "bold" : "medium"}
              style={{ fontSize: 14, color: active ? C.text : C.sec }}
            >
              {opt.label}
            </PretendardFont>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

import type { Row } from "@/types";

export function sortRows(rows: Row[], key: SortKey): Row[] {
  if (key === "default") return rows;
  return [...rows].sort((a, b) => {
    switch (key) {
      case "price_desc":
        return Number(b.scsbd_prc) - Number(a.scsbd_prc);
      case "price_asc":
        return Number(a.scsbd_prc) - Number(b.scsbd_prc);
      case "qty_desc":
        return Number(b.qty) - Number(a.qty);
      case "qty_asc":
        return Number(a.qty) - Number(b.qty);
      default:
        return 0;
    }
  });
}
