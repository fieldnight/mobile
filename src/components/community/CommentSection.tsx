/**
 * CommentSection
 *
 * [기능]
 * - 댓글 목록 조회 (GET /api/v1/posts/{postId}/comments)
 * - 댓글 등록 (POST)
 * - 댓글 수정 — 인라인 수정 (PUT, 403 처리)
 * - 댓글 삭제 — 낙관적 업데이트 (DELETE, 403 처리)
 *
 * [UX]
 * - 수정 탭 시 해당 아이템이 인라인 input으로 전환
 * - 삭제 탭 시 Alert confirm → 낙관적 삭제
 * - 등록 중 / 수정 중 로딩 인디케이터
 * - 에러 시 Alert 메시지
 */

import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/features/community/comment";
import { formatRelativeTime } from "@/components/community/utils/time";
import type { Comment } from "@/types/community";

interface CommentSectionProps {
  postId: number;
  commentCount: number;
}

export function CommentSection({ postId, commentCount }: CommentSectionProps) {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const {
    data: comments = [],
    isLoading,
    isError,
    refetch,
  } = useComments(postId);
  const { mutate: createComment, isPending: isCreating } =
    useCreateComment(postId);
  const { mutate: updateComment, isPending: isUpdating } =
    useUpdateComment(postId);
  const { mutate: deleteComment } = useDeleteComment(postId);

  // ── 등록 ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isCreating) return;
    createComment(
      { content: trimmed },
      {
        onSuccess: () => setInput(""),
        onError: (e) => {
          (Alert.alert("등록 실패", "댓글 등록에 실패했어요."),
            console.log("댓글 등록 실패:", e));
        },
      },
    );
  }, [input, isCreating, createComment]);

  // ── 수정 시작 ─────────────────────────────────────────────────────────────
  const startEdit = useCallback((comment: Comment) => {
    setEditingId(comment.commentId);
    setEditingText(comment.content);
  }, []);

  // ── 수정 확인 ─────────────────────────────────────────────────────────────
  const handleUpdate = useCallback(
    (commentId: number) => {
      const trimmed = editingText.trim();
      if (!trimmed) return;
      updateComment(
        { commentId, body: { content: trimmed } },
        {
          onSuccess: () => setEditingId(null),
          onError: (e: any) => {
            console.log("댓글 수정 실패:", e);
            const is403 = e?.response?.status === 403;
            const msg = is403
              ? "본인이 작성한 댓글만 수정할 수 있어요."
              : "수정에 실패했어요.";
            Alert.alert("수정 실패", msg);
            if (is403) setEditingId(null);
          },
        },
      );
    },
    [editingText, updateComment],
  );

  // ── 삭제 ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (commentId: number) => {
      Alert.alert("댓글 삭제", "정말 삭제할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () =>
            deleteComment(commentId, {
              onError: (e: any) => {
                console.log("댓글 삭제 실패:", e);
                const msg =
                  e?.response?.status === 403
                    ? "본인이 작성한 댓글만 삭제할 수 있어요."
                    : "삭제에 실패했어요.";
                Alert.alert("삭제 실패", msg);
              },
            }),
        },
      ]);
    },
    [deleteComment],
  );

  return (
    <View className="bg-white">
      {/* 헤더 */}
      <View
        className="flex-row items-center justify-between px-5 py-4"
        style={{ borderBottomWidth: 1, borderBottomColor: "#f2f4f6" }}
      >
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#191f28" }}>
          댓글 {isLoading || isError ? commentCount : comments.length}
        </Text>
        {isError && (
          <Pressable onPress={() => refetch()}>
            <Text style={{ fontSize: 13, color: "#f97316" }}>
              다시 불러오기
            </Text>
          </Pressable>
        )}
      </View>

      {/* 댓글 목록 */}
      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color="#8b95a1" />
        </View>
      ) : isError ? (
        <View className="items-center py-8">
          <Text style={{ fontSize: 13, color: "#8b95a1" }}>
            불러오지 못했어요
          </Text>
        </View>
      ) : comments.length === 0 ? (
        <View className="items-center py-10">
          <Feather name="message-circle" size={24} color="#b0b8c1" />
          <Text style={{ fontSize: 13, color: "#8b95a1", marginTop: 8 }}>
            첫 댓글을 남겨보세요
          </Text>
        </View>
      ) : (
        <View>
          {comments.map((comment) => (
            <CommentItem
              key={comment.commentId}
              comment={comment}
              isEditing={editingId === comment.commentId}
              editingText={editingText}
              isUpdating={isUpdating && editingId === comment.commentId}
              onEditChange={setEditingText}
              onEditStart={() => startEdit(comment)}
              onEditConfirm={() => handleUpdate(comment.commentId)}
              onEditCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(comment.commentId)}
            />
          ))}
        </View>
      )}

      {/* 댓글 입력창 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          className="flex-row items-end px-4 py-3 gap-2"
          style={{ borderTopWidth: 1, borderTopColor: "#f2f4f6" }}
        >
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="댓글을 입력하세요"
            placeholderTextColor="#b0b8c1"
            multiline
            maxLength={500}
            style={{
              flex: 1,
              backgroundColor: "#f2f4f6",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 14,
              color: "#191f28",
              maxHeight: 100,
              lineHeight: 20,
            }}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={!input.trim() || isCreating}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
                input.trim() && !isCreating ? "#191f28" : "#e5e8eb",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#8b95a1" />
            ) : (
              <Feather
                name="send"
                size={16}
                color={input.trim() ? "#ffffff" : "#b0b8c1"}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── 댓글 아이템 ───────────────────────────────────────────────────────────────
interface CommentItemProps {
  comment: Comment;
  isEditing: boolean;
  editingText: string;
  isUpdating: boolean;
  onEditChange: (text: string) => void;
  onEditStart: () => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

function CommentItem({
  comment,
  isEditing,
  editingText,
  isUpdating,
  onEditChange,
  onEditStart,
  onEditConfirm,
  onEditCancel,
  onDelete,
}: CommentItemProps) {
  return (
    <View
      className="px-5 py-3"
      style={{ borderBottomWidth: 1, borderBottomColor: "#f9fafb" }}
    >
      {/* 작성자 + 시간 */}
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "#f2f4f6",
              borderWidth: 1,
              borderColor: "#e5e8eb",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Feather name="user" size={12} color="#8b95a1" />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#191f28" }}>
            {comment.name}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text style={{ fontSize: 11, color: "#8b95a1" }}>
            {formatRelativeTime(comment.createdAt)}
          </Text>
          {/* 수정/삭제 버튼 */}
          {!isEditing && (
            <>
              <Pressable
                onPress={onEditStart}
                style={{ padding: 4, marginLeft: 4 }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="edit-2" size={13} color="#b0b8c1" />
              </Pressable>
              <Pressable
                onPress={onDelete}
                style={{ padding: 4 }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name="trash-2" size={13} color="#b0b8c1" />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* 본문 or 인라인 수정 */}
      {isEditing ? (
        <View>
          <TextInput
            value={editingText}
            onChangeText={onEditChange}
            multiline
            autoFocus
            maxLength={500}
            style={{
              backgroundColor: "#f2f4f6",
              borderRadius: 8,
              padding: 10,
              fontSize: 14,
              color: "#191f28",
              lineHeight: 20,
              minHeight: 60,
              textAlignVertical: "top",
            }}
          />
          <View className="flex-row justify-end gap-2 mt-2">
            <Pressable
              onPress={onEditCancel}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: "#f2f4f6",
              }}
            >
              <Text
                style={{ fontSize: 13, color: "#6b7684", fontWeight: "500" }}
              >
                취소
              </Text>
            </Pressable>
            <Pressable
              onPress={onEditConfirm}
              disabled={!editingText.trim() || isUpdating}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: editingText.trim() ? "#191f28" : "#e5e8eb",
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#8b95a1" />
              ) : (
                <Text
                  style={{
                    fontSize: 13,
                    color: editingText.trim() ? "#ffffff" : "#b0b8c1",
                    fontWeight: "600",
                  }}
                >
                  수정
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={{ fontSize: 14, color: "#4e5968", lineHeight: 22 }}>
          {comment.content}
        </Text>
      )}
    </View>
  );
}
