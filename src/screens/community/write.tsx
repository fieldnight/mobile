/**
 * 게시글 작성 / 수정 화면
 *
 * [동작]
 * - params에 postId 없음 → 신규 작성 (POST /api/v1/posts)
 * - params에 postId 있음 → 수정 (GET으로 기존 내용 불러온 뒤 PUT)
 *
 * [검증]
 * - 제목: 1자 이상
 * - 본문: 1자 이상
 * - 등록/수정 중 버튼 disabled
 *
 * [에러 처리]
 * - 403 → "본인 게시글만 수정 가능"
 * - 기타 → 공통 에러 알림
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  usePost,
  useCreatePost,
  useUpdatePost,
} from "@/features/community/post";

export default function WriteScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const router = useRouter();
  const parsedId = postId ? Number(postId) : NaN;
  const id = Number.isFinite(parsedId) ? parsedId : null;
  const isEdit = id !== null;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 수정 모드 — 기존 데이터 불러오기
  const { data: existingPost, isLoading: isFetchingPost } = usePost(id);

  const initialized = useRef(false);
  useEffect(() => {
    if (existingPost && !initialized.current) {
      setTitle(existingPost.title);
      setContent(existingPost.content);
      initialized.current = true;
    }
  }, [existingPost]);

  const { mutate: createPost, isPending: isCreating } = useCreatePost();
  const { mutate: updatePost, isPending: isUpdating } = useUpdatePost();

  const isPending = isCreating || isUpdating;
  const isValid = title.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!isValid || isPending) return;
    const body = { title: title.trim(), content: content.trim() };

    if (isEdit && id) {
      updatePost(
        { postId: id, body },
        {
          onSuccess: () => {
            Alert.alert("수정 완료", "게시글이 수정되었어요.");
            router.back();
          },
          onError: (e: any) => {
            const msg =
              e?.response?.status === 403
                ? "본인이 작성한 게시글만 수정할 수 있어요."
                : "수정에 실패했어요. 다시 시도해주세요.";
            Alert.alert("수정 실패", msg);
          },
        },
      );
    } else {
      createPost(body, {
        onSuccess: ({ postId: newId }) => {
          router.replace(`/community/${newId}` as any);
        },
        onError: () => {
          Alert.alert(
            "등록 실패",
            "게시글 등록에 실패했어요. 다시 시도해주세요.",
          );
        },
      });
    }
  }, [
    isValid,
    isPending,
    isEdit,
    id,
    title,
    content,
    createPost,
    updatePost,
    router,
  ]);

  // 수정 모드에서 기존 데이터 로딩 중
  if (isEdit && isFetchingPost) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <AppBar
          isEdit={isEdit}
          onBack={() => router.back()}
          onSubmit={handleSubmit}
          isValid={false}
          isPending={false}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b95a1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <AppBar
        isEdit={isEdit}
        onBack={() => router.back()}
        onSubmit={handleSubmit}
        isValid={isValid}
        isPending={isPending}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 카테고리 — UI만, API 미구현 */}
          <View className="flex-row flex-wrap gap-2 mb-5">
            {(["노하우", "질문", "소식", "나눔"] as const).map((cat, i) => (
              <View
                key={cat}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 999,
                  borderWidth: 1,
                  backgroundColor: i === 0 ? "#191f28" : "#ffffff",
                  borderColor: i === 0 ? "#191f28" : "#e5e8eb",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "500",
                    color: i === 0 ? "#ffffff" : "#6b7684",
                  }}
                >
                  {cat}
                </Text>
              </View>
            ))}
          </View>

          {/* 제목 입력 */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 입력하세요"
            placeholderTextColor="#b0b8c1"
            maxLength={100}
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#191f28",
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#e5e8eb",
              marginBottom: 16,
              letterSpacing: -0.3,
            }}
          />

          {/* 본문 입력 */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={`어떤 이야기를 나누고 싶으신가요?\n\n수정벌 관리 노하우, 착과율 개선 경험,\n궁금한 점 무엇이든 좋아요.`}
            placeholderTextColor="#b0b8c1"
            multiline
            maxLength={5000}
            style={{
              fontSize: 15,
              color: "#191f28",
              lineHeight: 24,
              minHeight: 300,
              textAlignVertical: "top",
            }}
          />
        </ScrollView>

        {/* 하단 툴바 — 이미지 첨부 등 (UI만) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: "#e5e8eb",
            backgroundColor: "#ffffff",
          }}
        >
          <Pressable className="w-10 h-10 items-center justify-center opacity-40">
            <Feather name="image" size={22} color="#191f28" />
          </Pressable>
          <Pressable className="w-10 h-10 items-center justify-center opacity-40">
            <Feather name="tag" size={20} color="#191f28" />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 12, color: "#b0b8c1" }}>
            {content.length} / 5000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── 앱바 ──────────────────────────────────────────────────────────────────────
interface AppBarProps {
  isEdit: boolean;
  onBack: () => void;
  onSubmit: () => void;
  isValid: boolean;
  isPending: boolean;
}

function AppBar({ isEdit, onBack, onSubmit, isValid, isPending }: AppBarProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 8,
        height: 56,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e8eb",
      }}
    >
      <Pressable
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={onBack}
      >
        <Feather name="x" size={22} color="#191f28" />
      </Pressable>

      <Text style={{ fontSize: 17, fontWeight: "700", color: "#191f28" }}>
        {isEdit ? "게시글 수정" : "글 작성"}
      </Text>

      <Pressable
        onPress={onSubmit}
        disabled={!isValid || isPending}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: isValid && !isPending ? "#191f28" : "#f2f4f6",
          minWidth: 64,
          alignItems: "center",
        }}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#8b95a1" />
        ) : (
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: isValid ? "#ffffff" : "#b0b8c1",
            }}
          >
            {isEdit ? "수정" : "등록"}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
