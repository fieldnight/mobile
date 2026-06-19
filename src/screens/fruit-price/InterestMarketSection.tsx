/**
 * 내 맞춤 시세 바로가기 섹션
 * - MarketCard             : 등록된 작물·시장 조합 카드 (탭 → 해당 시세로 이동, X → 삭제)
 * - AddMarketModal         : 시세 등록 바텀시트 — 현재 선택 중인 시장·작물 조합을 바로가기로 저장
 * - InterestMarketSection  : 바로가기 카드 목록 표시 + 시세 등록 액션
 */
import { useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  type GestureResponderEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useInterestMarkets,
  useDeleteInterestMarket,
  useAddInterestMarket,
  type InterestMarket,
} from "@/features/fruit-price";
import { WHOLESALE_MARKETS, LARGE_CATEGORY } from "@/constants/fruit-price";
import { Skeleton } from "@/components/Skeleton";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

const marketName = (code: string) =>
  WHOLESALE_MARKETS.find((m) => m.code === code)?.name ?? code;

const EMOJI: Record<string, string> = {
  딸기: "🍓", 사과: "🍎", 배: "🍐", 포도: "🍇", 복숭아: "🍑",
  토마토: "🍅", 수박: "🍉", 참외: "🍈", 감귤: "🍊", 블루베리: "🫐",
  망고: "🥭", 키위: "🥝", 자두: "🍒",
};
const emoji = (name: string) => EMOJI[name] ?? "";
const GUEST_SAMPLE_MARKET: InterestMarket = {
  interestMarketId: -1,
  marketCode: "110001",
  cropMajorCode: "06",
  cropMidName: "딸기",
  cropMinorName: "설향",
};

// ── 작물 카드 ─────────────────────────────────────────────────────────────────
function MarketCard({
  item,
  onPress,
  onDelete,
  readonly = false,
}: {
  item: InterestMarket;
  onPress: () => void;
  onDelete: () => void;
  readonly?: boolean;
}) {
  const handleDelete = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onDelete();
  };

  return (
    <Pressable
      onPress={onPress}
      className="mr-2.5 min-w-[152px] rounded-[14px] border-[1.5px] p-3 active:opacity-90"
      style={({ pressed }) => ({
        backgroundColor: pressed ? C.primarySoft : C.white,
        borderColor: pressed ? C.primary : C.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
      })}
    >
      {/* 작물명과 삭제 버튼을 한 줄에 배치해 카드 상단에서 바로 인지되도록 합니다. */}
      <View className="mb-2 flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
          {emoji(item.cropMidName) ? (
            <PretendardFont style={{ fontSize: 18 }}>
              {emoji(item.cropMidName)}
            </PretendardFont>
          ) : null}
          <PretendardFont
            weight="bold"
            className="flex-1"
            style={{ fontSize: 18, color: C.text, lineHeight: 23 }}
            numberOfLines={1}
          >
            {item.cropMidName}
          </PretendardFont>
        </View>
        {readonly ? (
          <View
            className="rounded-full px-2 py-1"
            style={{ backgroundColor: C.infoBg }}
          >
            <PretendardFont weight="semibold" style={{ fontSize: 10, color: C.primary }}>
              예시
            </PretendardFont>
          </View>
        ) : (
          <Pressable
            onPress={handleDelete}
            hitSlop={8}
            className="h-7 w-7 items-center justify-center rounded-full active:opacity-60"
            style={{ backgroundColor: C.bg }}
          >
            <Feather name="x" size={15} color={C.ter} />
          </Pressable>
        )}
      </View>

      {item.cropMinorName ? (
        <PretendardFont style={{ fontSize: 11, color: C.sec, marginBottom: 8 }} numberOfLines={1}>
          {item.cropMinorName}
        </PretendardFont>
      ) : (
        <View style={{ marginBottom: 8 }} />
      )}

      <View style={{ backgroundColor: C.bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-start" }}>
        <PretendardFont weight="semibold" style={{ fontSize: 10, color: C.sec }} numberOfLines={1}>
          {marketName(item.marketCode)}
        </PretendardFont>
      </View>
    </Pressable>
  );
}

// ── 등록 모달 ─────────────────────────────────────────────────────────────────
function AddMarketModal({
  visible, onClose, onAdd, isPending,
  currentMarketCode, currentLargeCode, currentMidName, currentMinorName,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (body: Omit<InterestMarket, "interestMarketId">) => void;
  isPending: boolean;
  currentMarketCode: string;
  currentLargeCode: string;
  currentMidName: string;
  currentMinorName: string;
}) {
  const isValid = currentMarketCode && currentLargeCode && currentMidName && currentMinorName;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={onClose} />
      <View style={{ backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 22 }} />

        <PretendardFont weight="bold" style={{ fontSize: 20, color: C.text, marginBottom: 6 }}>
          내 맞춤 작물 시세 등록
        </PretendardFont>
        <PretendardFont style={{ fontSize: 14, color: C.sec, marginBottom: 24, lineHeight: 22 }}>
          선택한 도매시장·작물 조합을 바로가기로{"\n"}저장하면 다음부터 한 번에 볼 수 있어요.
        </PretendardFont>

        {isValid ? (
          <View style={{ backgroundColor: C.primarySoft, borderRadius: 14, padding: 16, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: C.primary }}>
            <PretendardFont style={{ fontSize: 32 }}>{emoji(currentMidName)}</PretendardFont>
            <View style={{ flex: 1 }}>
              <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
                {currentMidName} {currentMinorName}
              </PretendardFont>
              <PretendardFont style={{ fontSize: 13, color: C.primary, marginTop: 3 }}>
                {marketName(currentMarketCode)} · {LARGE_CATEGORY[currentLargeCode] ?? currentLargeCode}
              </PretendardFont>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: C.bg, borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <PretendardFont weight="bold" style={{ fontSize: 18, color: C.text, marginBottom: 10 }}>
              아직 선택된 작물이 없어요
            </PretendardFont>
            <PretendardFont style={{ fontSize: 15, color: C.sec, lineHeight: 26 }}>
              {"화면 아래 "}
              <PretendardFont weight="semibold" style={{ color: C.primary }}>도매시장 시세 설정</PretendardFont>
              {" 섹션에서\n시장 · 대분류 · 중분류 · 소분류를\n모두 선택한 뒤 다시 눌러주세요."}
            </PretendardFont>
          </View>
        )}

        <Pressable
          onPress={() => {
            if (!isValid) return;
            onAdd({ marketCode: currentMarketCode, cropMajorCode: currentLargeCode, cropMidName: currentMidName, cropMinorName: currentMinorName });
          }}
          disabled={!isValid || isPending}
          className="active:opacity-80"
          style={{ backgroundColor: isValid && !isPending ? C.primary : C.border, borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
        >
          {isPending ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Feather name="bookmark" size={16} color={isValid ? C.white : C.ter} />
              <PretendardFont weight="bold" style={{ fontSize: 16, color: isValid ? C.white : C.ter }}>
                내 바로가기에 등록하기
              </PretendardFont>
            </>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

// ── 메인 섹션 ─────────────────────────────────────────────────────────────────
interface InterestMarketSectionProps {
  currentMarketCode: string;
  currentLargeCode: string;
  currentMidName: string;
  currentMinorName: string;
  isAuthenticated: boolean;
  onSelectMarket: (item: InterestMarket) => void;
  onShowToast: (msg: string, type?: "success" | "error") => void;
}

export function InterestMarketSection({
  currentMarketCode, currentLargeCode, currentMidName, currentMinorName,
  isAuthenticated, onSelectMarket, onShowToast,
}: InterestMarketSectionProps) {
  if (!isAuthenticated) {
    return <GuestInterestMarketSection onSelectMarket={onSelectMarket} />;
  }

  return (
    <MemberInterestMarketSection
      currentMarketCode={currentMarketCode}
      currentLargeCode={currentLargeCode}
      currentMidName={currentMidName}
      currentMinorName={currentMinorName}
      onSelectMarket={onSelectMarket}
      onShowToast={onShowToast}
    />
  );
}

function GuestInterestMarketSection({
  onSelectMarket,
}: {
  onSelectMarket: (item: InterestMarket) => void;
}) {
  return (
    <View className="border-t" style={{ borderTopColor: C.bg }}>
      {/* 비로그인 사용자는 저장 API를 호출하지 않고 예시 바로가기만 보여줍니다. */}
      <View className="px-4 pb-3 pt-3">
        <View
          className="flex-row items-start rounded-2xl border px-3.5 py-3"
          style={{ backgroundColor: C.infoBg, borderColor: C.sectionBorder, gap: 10 }}
        >
          <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
            <Feather name="lock" size={15} color={C.primary} />
          </View>
          <View className="flex-1">
            <PretendardFont weight="bold" style={{ fontSize: 13.5, color: C.text }}>
              로그인하면 내 맞춤 시세를 저장할 수 있어요
            </PretendardFont>
            <PretendardFont style={{ fontSize: 12.5, color: C.textAlt, lineHeight: 18, marginTop: 3 }}>
              지금은 예시로 서울가락 · 딸기 · 설향 바로가기를 보여드릴게요.
            </PretendardFont>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      >
        <MarketCard
          item={GUEST_SAMPLE_MARKET}
          onPress={() => onSelectMarket(GUEST_SAMPLE_MARKET)}
          onDelete={() => {}}
          readonly
        />
      </ScrollView>
    </View>
  );
}

type MemberInterestMarketSectionProps = Omit<InterestMarketSectionProps, "isAuthenticated">;

function MemberInterestMarketSection({
  currentMarketCode,
  currentLargeCode,
  currentMidName,
  currentMinorName,
  onSelectMarket,
  onShowToast,
}: MemberInterestMarketSectionProps) {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const { data: markets = [], isLoading } = useInterestMarkets();
  const { mutate: deleteMarket } = useDeleteInterestMarket();
  const { mutate: addMarket, isPending } = useAddInterestMarket();

  const handleDelete = (id: number) => {
    deleteMarket(id, {
      onSuccess: () => onShowToast("바로가기가 삭제됐어요.", "success"),
      onError: () => onShowToast("삭제에 실패했어요. 다시 시도해주세요.", "error"),
    });
  };

  const handleAdd = (body: Omit<InterestMarket, "interestMarketId">) => {
    addMarket(body, {
      onSuccess: () => {
        setAddModalVisible(false);
        onShowToast("바로가기가 등록됐어요! 👍", "success");
      },
      onError: (e: any) => {
        onShowToast(
          e?.response?.status === 409 ? "이미 등록된 바로가기예요." : "등록에 실패했어요.",
          "error",
        );
      },
    });
  };

  return (
    <View className="border-t" style={{ borderTopColor: C.bg }}>
      {/* 카드 위에 겹치지 않도록 등록 액션을 일반 레이아웃 흐름 안에 둡니다. */}
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <PretendardFont style={{ fontSize: 12, color: C.sec }}>
          자주 보는 시장·작물을 바로 열어요
        </PretendardFont>
        <Pressable
          onPress={() => setAddModalVisible(true)}
          className="flex-row items-center rounded-full px-3 py-2 active:opacity-80"
          style={{ backgroundColor: C.primary, gap: 6 }}
        >
          <Feather name="plus" size={13} color={C.white} />
          <PretendardFont weight="semibold" style={{ fontSize: 12, color: C.white }}>
            시세 등록
          </PretendardFont>
        </Pressable>
      </View>

      {/* 카드 목록 */}
      {isLoading ? (
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingBottom: 20 }}>
          {[130, 130, 130].map((w, i) => (
            <Skeleton key={i} height={100} width={w} borderRadius={14} />
          ))}
        </View>
      ) : markets.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 }}>
          <PretendardFont weight="semibold" style={{ fontSize: 14, color: C.sec, marginBottom: 4 }}>
            등록된 바로가기가 없어요
          </PretendardFont>
          <PretendardFont style={{ fontSize: 13, color: C.ter, lineHeight: 20 }}>
            {"아래 도매시장 시세 설정에서\n시장·작물을 선택 후 오른쪽 "}
            <PretendardFont weight="semibold" style={{ color: C.primary }}>시세 등록</PretendardFont>
            {" 버튼을 눌러주세요."}
          </PretendardFont>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        >
          {markets.map((item) => (
            <MarketCard
              key={item.interestMarketId}
              item={item}
              onPress={() => onSelectMarket(item)}
              onDelete={() => handleDelete(item.interestMarketId)}
            />
          ))}
        </ScrollView>
      )}

      <AddMarketModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={handleAdd}
        isPending={isPending}
        currentMarketCode={currentMarketCode}
        currentLargeCode={currentLargeCode}
        currentMidName={currentMidName}
        currentMinorName={currentMinorName}
      />
    </View>
  );
}
