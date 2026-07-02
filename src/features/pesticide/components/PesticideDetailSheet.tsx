/**
 * 농약 상세 바텀시트 (테이블 행 탭 시 노출)
 *
 * - 이미 관심 농약에 저장된 항목이면 버튼을 "닫기"로 표시
 * - 비로그인 상태에서 저장 시도 시 로그인 안내 바텀시트로 유도
 * - 저장 성공: 토스트 "관심 농약에 저장됐어요" + 시트 닫힘
 * - 409 중복: 토스트 "이미 저장된 관심 농약이에요"
 * - 그 외 에러: 토스트 "저장에 실패했어요. 다시 시도해주세요"
 */

import { useState } from "react";
import { Modal, View, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";
import { useAddInterestPesticide, useInterestPesticides } from "../hooks/useInterestPesticide";
import { useAppToast } from "@/components/ToastContext";
import { useAuthStore } from "@/stores/useAuthStore";
import { NoticeBottomSheet } from "@/components/NoticeBottomSheet";
import type { ResultItem } from "../hooks/utils";

interface Props {
  item: ResultItem | null;
  onClose: () => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <View
      className="flex-row py-3"
      style={{ borderBottomWidth: 1, borderColor: C.bg }}
    >
      <PretendardFont
        weight="semibold"
        style={{ width: 90, fontSize: 13, color: C.sec }}
      >
        {label}
      </PretendardFont>
      <PretendardFont
        weight="regular"
        style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 20 }}
      >
        {value}
      </PretendardFont>
    </View>
  );
}

export function PesticideDetailSheet({ item, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { mutate: addInterest, isPending } = useAddInterestPesticide();
  const { data: savedList } = useInterestPesticides();
  const { show: showToast } = useAppToast();
  const [loginNoticeVisible, setLoginNoticeVisible] = useState(false);

  // 현재 열린 항목이 이미 관심 농약에 저장돼 있는지 확인
  const alreadySaved = !!item && !!savedList?.some(
    (s) => s.pesticideApplicationNo === item.agchmApplcNo,
  );

  const goToLogin = () => {
    setLoginNoticeVisible(false);
    onClose();
    router.push({ pathname: "/login", params: { redirect: pathname } });
  };

  const handleSave = () => {
    if (!item || isPending) return;

    if (!isAuthenticated) {
      setLoginNoticeVisible(true);
      return;
    }

    addInterest(
      {
        pesticideApplicationNo: item.agchmApplcNo,
        brandName: item.brandNm,
        productName: item.prdlstNm,
        contentInfo: item.contInfo,
        safeSprayInterval: item.safeRdmtrTime,
        cropName: item.cropsNm,
        insectName: item.sprngspcsNm,
        usageName: item.prpos,
        targetPestName: item.applcsicknsHlsctsickns,
      },
      {
        onSuccess: () => {
          showToast("관심 농약에 저장됐어요", "success");
          onClose();
        },
        onError: (err: any) => {
          if (err?.response?.status === 409) {
            showToast("이미 저장된 관심 농약이에요", "error");
          } else {
            showToast("저장에 실패했어요. 다시 시도해주세요", "error");
          }
        },
      },
    );
  };

  return (
    <>
      <Modal
        visible={!!item}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        {/* 딤 배경 */}
        <Pressable className="flex-1 bg-black/40" onPress={onClose} />

        {/* 시트 본체 */}
        <View className="bg-white rounded-t-3xl" style={{ maxHeight: "75%" }}>
          {/* 핸들 */}
          <View className="items-center pt-3 pb-1">
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.border }} />
          </View>

          {/* 헤더 */}
          <View
            className="flex-row items-center justify-between px-5 py-3"
            style={{ borderBottomWidth: 1, borderColor: C.bg }}
          >
            <View style={{ flex: 1 }}>
              <View className="flex-row items-center gap-2">
                <PretendardFont weight="bold" numberOfLines={1} style={{ fontSize: 17, color: C.text }}>
                  {item?.brandNm}
                </PretendardFont>
                {/* 이미 저장된 항목 표시 */}
                {alreadySaved ? (
                  <Feather name="star" size={14} color={C.primary} />
                ) : null}
              </View>
              <PretendardFont weight="regular" style={{ fontSize: 13, color: C.sec, marginTop: 2 }}>
                {item?.prdlstNm}
              </PretendardFont>
            </View>
            <Pressable onPress={onClose} hitSlop={12} className="active:opacity-60 ml-3">
              <Feather name="x" size={20} color={C.sec} />
            </Pressable>
          </View>

          {/* 상세 정보 */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <InfoRow label="등록번호" value={item?.agchmApplcNo ?? ""} />
            <InfoRow label="함량" value={item?.contInfo ?? ""} />
            <InfoRow label="작물명" value={item?.cropsNm ?? ""} />
            <InfoRow label="봄종(곤충)" value={item?.sprngspcsNm ?? ""} />
            <InfoRow label="용도" value={item?.prpos ?? ""} />
            <InfoRow label="적용병해충" value={item?.applcsicknsHlsctsickns ?? ""} />
            <InfoRow label="안전방사간격" value={item?.safeRdmtrTime ?? ""} />
          </ScrollView>

          {/* 하단 버튼 */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 32,
              borderTopWidth: 1,
              borderColor: C.bg,
            }}
          >
            {alreadySaved ? (
              // 이미 저장된 항목 → 닫기 버튼
              <Pressable
                onPress={onClose}
                className="h-[52px] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
                style={{ backgroundColor: C.primary }}
              >
                <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.white }}>
                  닫기
                </PretendardFont>
              </Pressable>
            ) : (
              // 미저장 항목 → 저장 버튼
              <Pressable
                onPress={handleSave}
                disabled={isPending}
                className="h-[52px] rounded-2xl flex-row items-center justify-center gap-2 active:opacity-80"
                style={{ backgroundColor: isPending ? C.border : C.primary }}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <Feather name="star" size={18} color={C.white} />
                    <PretendardFont weight="semibold" style={{ fontSize: 16, color: C.white }}>
                      관심 농약 저장
                    </PretendardFont>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <NoticeBottomSheet
        visible={loginNoticeVisible}
        onClose={() => setLoginNoticeVisible(false)}
        title="로그인이 필요해요"
        message="관심 농약 저장은 로그인 후 이용할 수 있어요."
        icon="lock"
        snapHeight={0.4}
        actions={[
          { label: "로그인하기", onPress: goToLogin },
          {
            label: "계속 둘러보기",
            variant: "secondary",
            onPress: () => setLoginNoticeVisible(false),
          },
        ]}
      />
    </>
  );
}
