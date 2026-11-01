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
import { Tap } from "@/components/Tap";
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
    <Tap
      onPress={onPress}
      className="mr-2 min-w-[120px] rounded-lg px-3 py-2.5"
      style={({ pressed }) => ({ backgroundColor: pressed ? "#E8EBEF" : C.bgAlt })}
    >
      <View className="flex-row items-center justify-between gap-2">
        <PretendardFont
          weight="semibold"
          className="flex-1"
          style={{ fontSize: 15, color: C.text }}
          numberOfLines={1}
        >
          {emoji(item.cropMidName) ? `${emoji(item.cropMidName)} ` : ""}
          {item.cropMidName}
        </PretendardFont>
        {readonly ? (
          <PretendardFont style={{ fontSize: 11, color: C.ter }}>예시</PretendardFont>
        ) : (
          <Pressable
            onPress={handleDelete}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`${item.cropMidName} 바로가기 삭제`}
            className="active:opacity-60"
          >
            <Feather name="x" size={14} color={C.ter} />
          </Pressable>
        )}
      </View>
      {/* 품종과 시장은 한 줄 보조 글자로 묶습니다. */}
      <PretendardFont style={{ fontSize: 12, color: C.sec, marginTop: 2 }} numberOfLines={1}>
        {[item.cropMinorName, marketName(item.marketCode)].filter(Boolean).join(" · ")}
      </PretendardFont>
    </Tap>
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
      <View style={{ backgroundColor: C.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 22 }} />

        <PretendardFont weight="bold" style={{ fontSize: 20, color: C.text, marginBottom: 6 }}>
          내 맞춤 작물 시세 등록
        </PretendardFont>
        <PretendardFont style={{ fontSize: 14, color: C.sec, marginBottom: 24, lineHeight: 22 }}>
          선택한 도매시장·작물 조합을 바로가기로{"\n"}저장하면 다음부터 한 번에 볼 수 있어요.
        </PretendardFont>

        {isValid ? (
          <View style={{ backgroundColor: C.bgAlt, borderRadius: 10, padding: 16, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <PretendardFont style={{ fontSize: 32 }}>{emoji(currentMidName)}</PretendardFont>
            <View style={{ flex: 1 }}>
              <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
                {currentMidName} {currentMinorName}
              </PretendardFont>
              <PretendardFont style={{ fontSize: 13, color: C.sec, marginTop: 3 }}>
                {marketName(currentMarketCode)} · {LARGE_CATEGORY[currentLargeCode] ?? currentLargeCode}
              </PretendardFont>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: C.bgAlt, borderRadius: 10, padding: 16, marginBottom: 24 }}>
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
          style={{ backgroundColor: isValid && !isPending ? C.primary : C.border, borderRadius: 10, height: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
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

// 삭제는 되돌리기 어려운 액션이라 확인 모달에서 한 번 더 안전하게 받는다.
function DeleteMarketModal({
  item,
  visible,
  isPending,
  onClose,
  onConfirm,
}: {
  item: InterestMarket | null;
  visible: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="rounded-t-2xl bg-white px-6 pb-10 pt-5">
        <View
          className="mb-5 h-1 w-10 self-center rounded-full"
          style={{ backgroundColor: C.border }}
        />

        <View className="mb-5 flex-row items-start" style={{ gap: 12 }}>
          <View
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: C.infoBg }}
          >
            <Feather name="trash-2" size={18} color={C.primary} />
          </View>
          <View className="flex-1">
            <PretendardFont
              weight="bold"
              style={{ fontSize: 19, color: C.text }}
            >
              맞춤 시세를 삭제할까요?
            </PretendardFont>
            <PretendardFont
              style={{
                fontSize: 14,
                color: C.sec,
                lineHeight: 21,
                marginTop: 6,
              }}
            >
              {item
                ? `${marketName(item.marketCode)} · ${item.cropMidName} ${item.cropMinorName} 바로가기가 목록에서 사라져요.`
                : "선택한 바로가기가 목록에서 사라져요."}
            </PretendardFont>
          </View>
        </View>

        <View className="flex-row" style={{ gap: 10 }}>
          <Pressable
            onPress={onClose}
            disabled={isPending}
            className="flex-1 items-center rounded-lg py-4 active:opacity-80"
            style={{ backgroundColor: C.bgAlt }}
          >
            <PretendardFont
              weight="bold"
              style={{ fontSize: 14, color: C.textAlt }}
            >
              취소
            </PretendardFont>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={isPending}
            className="flex-1 items-center rounded-lg py-4 active:opacity-80"
            style={{ backgroundColor: C.primary }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <PretendardFont
                weight="bold"
                style={{ fontSize: 14, color: C.white }}
              >
                삭제하기
              </PretendardFont>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── 메인 섹션 ─────────────────────────────────────────────────────────────────
function SectionTitle({ right }: { right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between pl-3.5 pr-2 pt-2.5 pb-1.5">
      <PretendardFont weight="bold" style={{ fontSize: 16, color: C.text }}>
        내 맞춤 시세
      </PretendardFont>
      {right}
    </View>
  );
}

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
    <View>
      {/* 비로그인 사용자는 저장 API를 호출하지 않고 예시 바로가기만 보여줍니다. */}
      <SectionTitle
        right={
          <PretendardFont style={{ fontSize: 12, color: C.ter, paddingRight: 6 }}>
            로그인 후 저장
          </PretendardFont>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}
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
  const [pendingDelete, setPendingDelete] = useState<InterestMarket | null>(null);
  const { data: markets = [], isLoading } = useInterestMarkets();
  const deleteMarketMutation = useDeleteInterestMarket();
  const { mutate: addMarket, isPending } = useAddInterestMarket();

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;

    deleteMarketMutation.mutate(pendingDelete.interestMarketId, {
      onSuccess: () => {
        setPendingDelete(null);
        onShowToast("바로가기가 삭제됐어요.", "success");
      },
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
    <View>
      <SectionTitle
        right={
          <Tap
            onPress={() => setAddModalVisible(true)}
            accessibilityRole="button"
            className="flex-row items-center rounded-md px-2 py-1.5"
            style={({ pressed }) => ({ gap: 3, backgroundColor: pressed ? C.bgAlt : "transparent" })}
          >
            <Feather name="plus" size={14} color={C.textAlt} />
            <PretendardFont weight="semibold" style={{ fontSize: 13, color: C.textAlt }}>
              등록
            </PretendardFont>
          </Tap>
        }
      />

      {/* 카드 목록 */}
      {isLoading ? (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
          {[120, 120, 120].map((w, i) => (
            <Skeleton key={i} height={56} width={w} borderRadius={8} />
          ))}
        </View>
      ) : markets.length === 0 ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <PretendardFont style={{ fontSize: 13, color: C.sec }}>
            아래에서 시장·작물을 고른 뒤 등록하세요
          </PretendardFont>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}
        >
          {markets.map((item) => (
            <MarketCard
              key={item.interestMarketId}
              item={item}
              onPress={() => onSelectMarket(item)}
              onDelete={() => setPendingDelete(item)}
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
      <DeleteMarketModal
        item={pendingDelete}
        visible={pendingDelete != null}
        isPending={deleteMarketMutation.isPending}
        onClose={() => {
          if (!deleteMarketMutation.isPending) setPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
}
