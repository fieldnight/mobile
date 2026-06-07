import { useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
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

const marketName = (code: string) =>
  WHOLESALE_MARKETS.find((m) => m.code === code)?.name ?? code;

const EMOJI: Record<string, string> = {
  딸기: "🍓",
  사과: "🍎",
  배: "🍐",
  포도: "🍇",
  복숭아: "🍑",
  토마토: "🍅",
  수박: "🍉",
  참외: "🍈",
  감귤: "🍊",
  블루베리: "🫐",
  망고: "🥭",
  키위: "🥝",
  자두: "🍒",
};
const emoji = (name: string) => EMOJI[name] ?? "";

// ── 작물 카드 ─────────────────────────────────────────────────────────────────
function MarketCard({
  item,
  onPress,
  onDelete,
}: {
  item: InterestMarket;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#EFF6FF" : "#fff",
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: pressed ? "#BFDBFE" : "#E8EEF5",
        padding: 12,
        marginRight: 10,
        minWidth: 130,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      })}
    >
      {/* 상단: 이모지 + 삭제 버튼 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <PretendardFont style={{ fontSize: 24 }}>
          {emoji(item.cropMidName)}
        </PretendardFont>
        <Pressable
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: pressed ? "#CBD5E1" : "#F1F5F9",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Feather name="x" size={12} color="#94A3B8" />
        </Pressable>
      </View>

      {/* 작물명 */}
      <PretendardFont
        weight="bold"
        style={{ fontSize: 13, color: "#1E293B", marginBottom: 2 }}
        numberOfLines={1}
      >
        {item.cropMidName}
      </PretendardFont>
      {item.cropMinorName ? (
        <PretendardFont
          style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}
          numberOfLines={1}
        >
          {item.cropMinorName}
        </PretendardFont>
      ) : (
        <View style={{ marginBottom: 8 }} />
      )}

      {/* 시장 태그 */}
      <View
        style={{
          backgroundColor: "#F1F5F9",
          borderRadius: 6,
          paddingHorizontal: 7,
          paddingVertical: 3,
          alignSelf: "flex-start",
        }}
      >
        <PretendardFont
          weight="semibold"
          style={{ fontSize: 10, color: "#475569" }}
          numberOfLines={1}
        >
          {marketName(item.marketCode)}
        </PretendardFont>
      </View>
    </Pressable>
  );
}

// ── 추가 모달 ─────────────────────────────────────────────────────────────────
function AddMarketModal({
  visible,
  onClose,
  onAdd,
  isPending,
  currentMarketCode,
  currentLargeCode,
  currentMidName,
  currentMinorName,
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
  const isValid =
    currentMarketCode && currentLargeCode && currentMidName && currentMinorName;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      />
      <View
        style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          paddingBottom: 44,
        }}
      >
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#E2E8F0",
            alignSelf: "center",
            marginBottom: 22,
          }}
        />

        <PretendardFont
          weight="bold"
          style={{ fontSize: 20, color: "#1E293B", marginBottom: 6 }}
        >
          내 맞춤 작물 시세 등록
        </PretendardFont>
        <PretendardFont
          style={{
            fontSize: 14,
            color: "#64748B",
            marginBottom: 24,
            lineHeight: 22,
          }}
        >
          선택한 도매시장·작물 조합을 바로가기로{"\n"}저장하면 다음부터 한 번에
          볼 수 있어요.
        </PretendardFont>

        {isValid ? (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 14,
              padding: 16,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <PretendardFont style={{ fontSize: 32 }}>
              {emoji(currentMidName)}
            </PretendardFont>
            <View style={{ flex: 1 }}>
              <PretendardFont
                weight="bold"
                style={{ fontSize: 16, color: "#1E293B" }}
              >
                {currentMidName} {currentMinorName}
              </PretendardFont>
              <PretendardFont
                style={{ fontSize: 13, color: "#3B82F6", marginTop: 3 }}
              >
                {marketName(currentMarketCode)} ·{" "}
                {LARGE_CATEGORY[currentLargeCode] ?? currentLargeCode}
              </PretendardFont>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#FFFBEB",
              borderRadius: 14,
              padding: 16,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              borderWidth: 1,
              borderColor: "#FDE68A",
            }}
          >
            <Feather
              name="alert-circle"
              size={18}
              color="#F59E0B"
              style={{ marginTop: 1 }}
            />
            <PretendardFont
              style={{
                fontSize: 14,
                color: "#92400E",
                flex: 1,
                lineHeight: 22,
              }}
            >
              도매시장·대분류·중분류·소분류를{"\n"}모두 선택해야 등록할 수
              있어요.
            </PretendardFont>
          </View>
        )}

        <TouchableOpacity
          onPress={() => {
            if (!isValid) return;
            onAdd({
              marketCode: currentMarketCode,
              cropMajorCode: currentLargeCode,
              cropMidName: currentMidName,
              cropMinorName: currentMinorName,
            });
          }}
          disabled={!isValid || isPending}
          style={{
            backgroundColor: isValid && !isPending ? "#2563EB" : "#E2E8F0",
            borderRadius: 14,
            height: 54,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather
                name="bookmark"
                size={16}
                color={isValid ? "#fff" : "#94A3B8"}
              />
              <PretendardFont
                weight="bold"
                style={{ fontSize: 16, color: isValid ? "#fff" : "#94A3B8" }}
              >
                내 바로가기에 등록하기
              </PretendardFont>
            </>
          )}
        </TouchableOpacity>
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
  onSelectMarket: (item: InterestMarket) => void;
  onShowToast: (msg: string, type?: "success" | "error") => void;
}

export function InterestMarketSection({
  currentMarketCode,
  currentLargeCode,
  currentMidName,
  currentMinorName,
  onSelectMarket,
  onShowToast,
}: InterestMarketSectionProps) {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const { data: markets = [], isLoading } = useInterestMarkets();
  const { mutate: deleteMarket } = useDeleteInterestMarket();
  const { mutate: addMarket, isPending } = useAddInterestMarket();

  const handleDelete = (id: number) => {
    deleteMarket(id, {
      onSuccess: () => onShowToast("바로가기가 삭제됐어요.", "success"),
      onError: () =>
        onShowToast("삭제에 실패했어요. 다시 시도해주세요.", "error"),
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
          e?.response?.status === 409
            ? "이미 등록된 바로가기예요."
            : "등록에 실패했어요.",
          "error",
        );
      },
    });
  };

  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
      {/* 카드 컨테이너 */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: "#E8EEF5",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#F1F5F9",
          }}
        >
          <View>
            <PretendardFont
              weight="bold"
              style={{ fontSize: 14, color: "#1E293B" }}
            >
              등록된 바로가기
            </PretendardFont>
            <PretendardFont
              style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}
            >
              카드를 탭하면 해당 시세로 바로 이동해요
            </PretendardFont>
          </View>

          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            style={{
              backgroundColor: "#2563EB",
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 9,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#fff" />
            <PretendardFont
              weight="bold"
              style={{ fontSize: 13, color: "#fff" }}
            >
              시세 등록
            </PretendardFont>
          </TouchableOpacity>
        </View>

        {/* 카드 목록 */}
        <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
          {isLoading ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[130, 130, 130].map((w, i) => (
                <Skeleton key={i} height={100} width={w} borderRadius={14} />
              ))}
            </View>
          ) : markets.length === 0 ? (
            // alignItems 제거 → Text가 전체 너비를 쓸 수 있어 줄바꿈이 정상 동작
            <View style={{ paddingVertical: 10 }}>
              <PretendardFont
                style={{ fontSize: 28, marginBottom: 8, textAlign: "center" }}
              >
                🌾
              </PretendardFont>
              <PretendardFont
                weight="semibold"
                style={{
                  fontSize: 14,
                  color: "#475569",
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                등록된 바로가기가 없어요
              </PretendardFont>
              <PretendardFont
                style={{
                  fontSize: 12,
                  color: "#94A3B8",
                  textAlign: "center",
                  lineHeight: 18,
                }}
              >
                {"아래에서 도매시장·작물을 선택하고\n오른쪽 "}
                <PretendardFont weight="semibold" style={{ color: "#2563EB" }}>
                  시세 등록
                </PretendardFont>
                {" 버튼을 눌러보세요"}
              </PretendardFont>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
        </View>
      </View>

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
