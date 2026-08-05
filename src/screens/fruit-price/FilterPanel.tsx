/**
 * 도매시장 선택 드롭다운 패널
 * - 공용 FilterDropdown(바텀시트)을 사용 — index.tsx 의 Card 2(도매시장 시세 설정)에서 사용
 */
import { View } from "react-native";
import { WHOLESALE_MARKETS } from "@/constants/fruit-price";
import { FilterDropdown } from "@/components/FilterDropdown";

interface FilterPanelProps {
  marketCode: string;
  onMarketChange: (code: string) => void;
}

export function FilterPanel({ marketCode, onMarketChange }: FilterPanelProps) {
  return (
    <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
      <FilterDropdown
        label="도매시장 선택"
        value={marketCode}
        options={WHOLESALE_MARKETS.map((m) => ({
          label: m.name,
          value: m.code,
          hint: m.code,
        }))}
        onSelect={onMarketChange}
        allOption
      />
    </View>
  );
}
