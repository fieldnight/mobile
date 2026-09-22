/**
 * 커뮤니티 게시글 카드
 * - 작성자(더미) / 제목 / 본문 미리보기 / 좋아요·댓글 수 표시
 * - memo로 감싸 title·content·likeCount·commentCount 변경 시만 리렌더
 */
import { memo } from "react";
import { View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LikeButton } from "./LikeButton";
import { formatRelativeTime } from "@/components/community/utils/time";
import { PretendardFont } from "@/components/PretendardFont";
import type { PostListItem } from "@/types/community";

interface PostCardProps {
  post: PostListItem;
  onPress: (postId: number) => void;
}

function PostCardComponent({ post, onPress }: PostCardProps) {
  return (
    <Pressable
      onPress={() => onPress(post.postId)}
      className="bg-white rounded-xl p-4 mx-5 mb-2.5"
      style={{
        borderWidth: 1,
        borderColor: "#e5e8eb",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      {/* 헤더 — 작성자 정보는 API 미구현이라 더미 */}
      <View className="flex-row items-center gap-2 mb-2.5">
        <View
          className="w-8 h-8 rounded-full items-center justify-center overflow-hidden"
          style={{
            backgroundColor: "#f2f4f6",
            borderWidth: 1.5,
            borderColor: "#e5e8eb",
          }}
        >
          <Feather name="user" size={14} color="#8b95a1" />
        </View>
        <View className="flex-1 min-w-0">
          <PretendardFont
            weight="semibold"
            style={{ fontSize: 13, color: "#191f28" }}
            numberOfLines={1}
          >
            농부 · {post.postId}번째 게시글
          </PretendardFont>
          <PretendardFont style={{ fontSize: 11, color: "#8b95a1" }}>
            {formatRelativeTime(post.createdAt)}
          </PretendardFont>
        </View>
      </View>

      {/* 제목 */}
      <PretendardFont
        weight="semibold"
        style={{ fontSize: 15, color: "#191f28", lineHeight: 20, marginBottom: 6 }}
        numberOfLines={2}
      >
        {post.title}
      </PretendardFont>

      {/* 본문 미리보기 */}
      <PretendardFont
        style={{ fontSize: 13, color: "#6b7684", lineHeight: 20, marginBottom: 10 }}
        numberOfLines={2}
      >
        {post.content}
      </PretendardFont>

      {/* 액션 바 */}
      <View
        className="flex-row items-center gap-4 pt-2.5"
        style={{ borderTopWidth: 1, borderTopColor: "#f2f4f6" }}
      >
        <LikeButton initialCount={post.likeCount} />
        <View className="flex-row items-center gap-1">
          <Feather name="message-square" size={15} color="#8b95a1" />
          <PretendardFont weight="medium" style={{ fontSize: 12, color: "#8b95a1" }}>
            {post.commentCount}
          </PretendardFont>
        </View>
      </View>
    </Pressable>
  );
}

export const PostCard = memo(PostCardComponent, (prev, next) => {
  return (
    prev.post.postId === next.post.postId &&
    prev.post.title === next.post.title &&
    prev.post.content === next.post.content &&
    prev.post.likeCount === next.post.likeCount &&
    prev.post.commentCount === next.post.commentCount
  );
});
