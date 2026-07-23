import { Pressable, ScrollView } from "react-native";

import { PretendardFont } from "@/components/PretendardFont";
import type { BeeMapFilter } from "../model/mapPlace";

interface FilterItem {
  value: BeeMapFilter;
  label: string;
  count: number;
}

interface BeeMapFilterBarProps {
  value: BeeMapFilter;
  counts: Record<BeeMapFilter, number>;
  onChange: (value: BeeMapFilter) => void;
}

export function BeeMapFilterBar({
  value,
  counts,
  onChange,
}: BeeMapFilterBarProps) {
  const filters: FilterItem[] = [
    { value: "all", label: "전체", count: counts.all },
    { value: "seller", label: "수정벌 판매처", count: counts.seller },
    { value: "farm", label: "스마트벌통 농장", count: counts.farm },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 20 }}
    >
      {filters.map((filter) => {
        const selected = filter.value === value;

        return (
          <Pressable
            key={filter.value}
            className={`flex-row items-center rounded-full px-4 py-2 ${
              selected ? "bg-gray-900" : "bg-gray-100"
            }`}
            onPress={() => onChange(filter.value)}
          >
            <PretendardFont
              weight={selected ? "bold" : "medium"}
              className={`text-sm ${selected ? "text-white" : "text-gray-800"}`}
            >
              {filter.label}
            </PretendardFont>
            <PretendardFont
              weight="bold"
              className={`ml-1 text-sm ${selected ? "text-main-700" : "text-gray-700"}`}
            >
              {filter.count}
            </PretendardFont>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
