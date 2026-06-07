import { View, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PretendardFont } from "@/components/PretendardFont";

// ── 게시글 카드 스켈레톤 ────────────────────────────────────────────────────
export function PostCardSkeleton() {
  return (
    <View
      className="bg-white rounded-xl p-4 mx-5 mb-2.5"
      style={{ borderWidth: 1, borderColor: "#e5e8eb" }}
    >
      <View className="flex-row items-center gap-2 mb-2.5">
        <View
          className="w-8 h-8 rounded-full"
          style={{ backgroundColor: "#f2f4f6" }}
        />
        <View className="flex-1">
          <View
            className="h-3 rounded mb-1"
            style={{ backgroundColor: "#f2f4f6", width: "40%" }}
          />
          <View
            className="h-2.5 rounded"
            style={{ backgroundColor: "#f2f4f6", width: "25%" }}
          />
        </View>
      </View>
      <View
        className="h-4 rounded mb-2"
        style={{ backgroundColor: "#f2f4f6", width: "90%" }}
      />
      <View
        className="h-3 rounded mb-1"
        style={{ backgroundColor: "#f2f4f6", width: "100%" }}
      />
      <View
        className="h-3 rounded mb-3"
        style={{ backgroundColor: "#f2f4f6", width: "75%" }}
      />
      <View
        className="h-4 rounded"
        style={{ backgroundColor: "#f2f4f6", width: "30%" }}
      />
    </View>
  );
}

// ── 빈 상태 ──────────────────────────────────────────────────────────────────
export function EmptyState({ onWritePress }: { onWritePress?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
        style={{ backgroundColor: "#f2f4f6" }}
      >
        <Feather name="message-circle" size={24} color="#b0b8c1" />
      </View>
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 15, color: "#4e5968", marginBottom: 4 }}
      >
        아직 올라온 글이 없어요
      </PretendardFont>
      <PretendardFont
        style={{ fontSize: 13, color: "#8b95a1", textAlign: "center", lineHeight: 20, marginBottom: 20 }}
      >
        첫 번째 이야기를 공유해보세요.{"\n"}다른 농부들이 반가워할 거예요.
      </PretendardFont>
      {onWritePress && (
        <Pressable
          onPress={() => {
            console.log("pressed");
            onWritePress?.();
          }}
          className="rounded-lg"
          style={{
            backgroundColor: "#e8f3ff",
            paddingHorizontal: 18,
            paddingVertical: 10,
          }}
        >
          <PretendardFont weight="semibold" style={{ fontSize: 14, color: "#f97316" }}>
            글쓰기
          </PretendardFont>
        </Pressable>
      )}
    </View>
  );
}

// ── 에러 상태 ────────────────────────────────────────────────────────────────
export function ErrorState({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-10 py-16">
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center mb-4"
        style={{ backgroundColor: "#FEF2F2" }}
      >
        <Feather name="wifi-off" size={22} color="#f04452" />
      </View>
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 15, color: "#4e5968", marginBottom: 4 }}
      >
        불러오지 못했어요
      </PretendardFont>
      <PretendardFont
        style={{ fontSize: 13, color: "#8b95a1", textAlign: "center", lineHeight: 20, marginBottom: 20 }}
      >
        {message ?? "잠시 후 다시 시도해주세요."}
      </PretendardFont>
      <Pressable
        onPress={onRetry}
        className="rounded-lg flex-row items-center gap-1.5"
        style={{
          backgroundColor: "#191f28",
          paddingHorizontal: 18,
          paddingVertical: 10,
        }}
      >
        <Feather name="refresh-cw" size={14} color="#ffffff" />
        <PretendardFont weight="semibold" style={{ fontSize: 14, color: "#ffffff" }}>
          다시 시도
        </PretendardFont>
      </Pressable>
    </View>
  );
}

// ── 로딩 푸터 (무한 스크롤 다음 페이지 로딩 중) ───────────────────────────
export function LoadMoreFooter({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <View className="py-6 items-center">
      <ActivityIndicator size="small" color="#8b95a1" />
    </View>
  );
}
