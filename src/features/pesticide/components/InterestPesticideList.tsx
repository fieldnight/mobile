/**
 * 관심 농약 섹션
 *
 * [비어있을 때] 안내 힌트
 * [항목 있을 때] 가로 스크롤 칩 → 탭 시 PesticideDetailSheet 재사용
 */

import { memo, useState, useCallback } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";
import { Card } from "@/components/hive/hive-shared";
import { C } from "@/constants/hive-colors";
import {
  useInterestPesticides,
  useDeleteInterestPesticide,
} from "../hooks/useInterestPesticide";
import type { InterestPesticide } from "../hooks/useInterestPesticide";
import { useAppToast } from "@/components/ToastContext";
import { PesticideDetailSheet } from "./PesticideDetailSheet";
import type { ResultItem } from "../hooks/utils";

// InterestPesticide → ResultItem 변환 (PesticideDetailSheet 재사용을 위해)
function toResultItem(p: InterestPesticide): ResultItem {
  return {
    agchmApplcNo: p.pesticideApplicationNo,
    brandNm: p.brandName,
    prdlstNm: p.productName,
    contInfo: p.contentInfo,
    safeRdmtrTime: p.safeSprayInterval,
    cropsNm: p.cropName,
    sprngspcsNm: p.insectName,
    prpos: p.usageName,
    applcsicknsHlsctsickns: p.targetPestName,
  };
}

// ── 개별 칩 ───────────────────────────────────────────────────────────────────

const PesticideChip = memo(function PesticideChip({
  item,
  onTap,
  onDelete,
}: {
  item: InterestPesticide;
  onTap: (item: InterestPesticide) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Pressable
      onPress={() => onTap(item)}
      className="flex-row items-center active:opacity-70"
      style={{
        backgroundColor: C.white,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: 7,
        marginRight: 10,
        gap: 5,
      }}
    >
      <Feather name="star" size={14} color={C.primary} />
      <PretendardFont
        weight="semibold"
        numberOfLines={1}
        style={{ fontSize: 15, color: C.text, maxWidth: 130 }}
      >
        {item.brandName}
      </PretendardFont>
      {item.cropName ? (
        <PretendardFont weight="regular" style={{ fontSize: 13, color: C.ter }}>
          · {item.cropName}
        </PretendardFont>
      ) : null}
      <Pressable
        onPress={() => onDelete(item.interestPesticideId)}
        hitSlop={8}
        className="active:opacity-50 ml-1"
      >
        <Feather name="x" size={16} color={C.ter} />
      </Pressable>
    </Pressable>
  );
});

// ── 빈 상태 ───────────────────────────────────────────────────────────────────

function EmptyHint() {
  return (
    <View
      className="flex-row items-center gap-3 px-4 py-4"
      style={{
        backgroundColor: C.bg,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        borderStyle: "dashed",
      }}
    >
      <Feather name="star" size={20} color={C.ter} />
      <View style={{ flex: 1 }}>
        <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.sec }}>
          관심 농약이 없어요
        </PretendardFont>
        <PretendardFont weight="regular" style={{ fontSize: 13, color: C.ter, marginTop: 4 }}>
          아래 검색 결과 행을 탭하면 저장할 수 있어요
        </PretendardFont>
      </View>
    </View>
  );
}

// ── 섹션 루트 ─────────────────────────────────────────────────────────────────

export function InterestPesticideList() {
  const { data: list, isLoading } = useInterestPesticides();
  const { mutate: remove } = useDeleteInterestPesticide();
  const { show: showToast } = useAppToast();
  const [selectedItem, setSelectedItem] = useState<ResultItem | null>(null);

  const handleDelete = useCallback((id: number) => {
    remove(id, {
      onError: (err: any) => {
        if (err?.response?.status === 404) {
          showToast("이미 삭제된 관심 농약입니다.", "error");
        } else {
          showToast("삭제에 실패했어요. 다시 시도해주세요", "error");
        }
      },
    });
  }, [remove, showToast]);

  const handleTap = useCallback((item: InterestPesticide) => {
    setSelectedItem(toResultItem(item));
  }, []);

  if (isLoading) {
    return (
      <Card delay={0} style={{ paddingVertical: 18, paddingHorizontal: 18 }}>
        <ActivityIndicator size="small" color={C.primary} />
      </Card>
    );
  }

  return (
    <Card delay={0} style={{ padding: 0, overflow: "hidden" }}>
      {/* 헤더 */}
      <View
        className="flex-row items-center"
        style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 7 }}
      >
        <Feather name="star" size={17} color={C.primary} />
        <PretendardFont weight="bold" style={{ fontSize: 17, color: C.text }}>
          관심 농약
        </PretendardFont>
        {list?.length ? (
          <PretendardFont weight="regular" style={{ fontSize: 13, color: C.ter }}>
            {list.length}개
          </PretendardFont>
        ) : null}
      </View>

      {/* 내용 */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 15 }}>
        {!list?.length ? (
          <EmptyHint />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 4 }}
          >
            {list.map((item) => (
              <PesticideChip
                key={item.interestPesticideId}
                item={item}
                onTap={handleTap}
                onDelete={handleDelete}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* 칩 탭 시 → PesticideDetailSheet 재사용 (이미 저장된 항목이므로 버튼은 "닫기") */}
      <PesticideDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </Card>
  );
}
