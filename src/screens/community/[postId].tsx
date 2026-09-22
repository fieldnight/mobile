/**
 * 게시글 상세 화면
 *
 * [기능]
 * - 게시글 단건 조회 (GET /api/v1/posts/{postId})
 * - 게시글 삭제 (본인만) — 더미 본인 판단 (authorId 없어서 UI만)
 * - 수정 버튼 → write 화면으로 postId 전달
 * - 좋아요 UI (API 미구현)
 * - 댓글 섹션 (CommentSection — API 연동 대기)
 *
 * [에러 처리]
 * - 404 → "삭제된 게시글" 안내
 * - 네트워크 오류 → retry 버튼
 */

import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { usePost, useDeletePost } from "@/features/community/post";
import { LikeButton } from "@/components/community/LikeButton";
import { ErrorState } from "@/components/community/States";
import { formatRelativeTime } from "@/components/community/utils/time";
import { CommentSection } from "@/components/community/CommentSection";

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const id = Number(postId);

  const { data: post, isLoading, isError, error, refetch } = usePost(id);
  const { mutate: deletePost, isPending: isDeleting } = useDeletePost();

  const handleDelete = useCallback(() => {
    Alert.alert("게시글 삭제", "정말 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          deletePost(id, {
            onSuccess: () => router.back(),
            onError: (e: any) => {
              const msg =
                e?.response?.status === 403
                  ? "본인이 작성한 게시글만 삭제할 수 있어요."
                  : "삭제에 실패했어요. 다시 시도해주세요.";
              Alert.alert("삭제 실패", msg);
            },
          });
        },
      },
    ]);
  }, [id, deletePost, router]);

  const handleEdit = useCallback(() => {
    router.push({
      pathname: "/community/write" as any,
      params: { postId: id },
    });
  }, [id, router]);

  // ── 로딩 ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <AppBar onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8b95a1" />
        </View>
      </SafeAreaView>
    );
  }

  // ── 에러 ──────────────────────────────────────────────────────────────────
  const status = (error as any)?.response?.status;
  if (isError || !post) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <AppBar onBack={() => router.back()} />
        <ErrorState
          onRetry={() => refetch()}
          message={
            status === 404
              ? "삭제되었거나 존재하지 않는 게시글이에요."
              : "게시글을 불러오지 못했어요."
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: "#f2f4f6" }}
      edges={["top"]}
    >
      {/* 앱바 */}
      <View
        className="flex-row items-center justify-between px-2 bg-white"
        style={{
          height: 56,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e8eb",
        }}
      >
        <Pressable
          className="w-10 h-10 items-center justify-center"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color="#191f28" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: "#191f28" }}>
          게시글
        </Text>
        <View className="flex-row">
          <Pressable
            className="w-10 h-10 items-center justify-center"
            onPress={handleEdit}
          >
            <Feather name="edit-2" size={20} color="#6b7684" />
          </Pressable>
          <Pressable
            className="w-10 h-10 items-center justify-center"
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Feather
              name="trash-2"
              size={20}
              color={isDeleting ? "#b0b8c1" : "#f04452"}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 게시글 본문 */}
        <View className="bg-white px-5 py-5 mb-2">
          {/* 작성자 (API에 없어서 더미) */}
          <View className="flex-row items-center gap-2 mb-4">
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{
                backgroundColor: "#f2f4f6",
                borderWidth: 1.5,
                borderColor: "#e5e8eb",
              }}
            >
              <Feather name="user" size={16} color="#8b95a1" />
            </View>
            <View>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#191f28" }}
              >
                농부 · {post.postId}번째 게시글
              </Text>
              <Text style={{ fontSize: 12, color: "#8b95a1", marginTop: 1 }}>
                {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </View>

          {/* 제목 */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#191f28",
              lineHeight: 28,
              marginBottom: 14,
              letterSpacing: -0.3,
            }}
          >
            {post.title}
          </Text>

          {/* 본문 */}
          <Text style={{ fontSize: 15, color: "#4e5968", lineHeight: 24 }}>
            {post.content}
          </Text>

          {/* 액션 바 */}
          <View
            className="flex-row items-center gap-5 mt-5 pt-4"
            style={{ borderTopWidth: 1, borderTopColor: "#f2f4f6" }}
          >
            <LikeButton initialCount={post.likeCount} />
            <View style={{ flex: 1 }} />
            <Pressable>
              <Feather name="share-2" size={18} color="#8b95a1" />
            </Pressable>
          </View>
        </View>

        {/* 댓글 섹션 */}
        <CommentSection postId={id} commentCount={post.commentCount} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AppBar({ onBack }: { onBack: () => void }) {
  return (
    <View
      className="flex-row items-center px-2 bg-white"
      style={{ height: 56, borderBottomWidth: 1, borderBottomColor: "#e5e8eb" }}
    >
      <Pressable
        className="w-10 h-10 items-center justify-center"
        onPress={onBack}
      >
        <Feather name="arrow-left" size={22} color="#191f28" />
      </Pressable>
      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: "#191f28",
          marginLeft: 4,
        }}
      >
        게시글
      </Text>
    </View>
  );
}
