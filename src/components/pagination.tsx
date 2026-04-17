/**
 * 공용 페이지네이션 컴포넌트
 *
 * 사용법:
 * <Pagination page={page} totalPages={totalPages} onPage={setPage} />
 */

import { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  groupSize?: number; // 한 번에 보여줄 페이지 수 (기본 5)
}

const Pagination = memo(
  ({ page, totalPages, onPage, groupSize = 5 }: PaginationProps) => {
    if (totalPages <= 1) return null;

    const group = Math.floor((page - 1) / groupSize);
    const start = group * groupSize + 1;
    const end = Math.min(start + groupSize - 1, totalPages);
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    return (
      <View style={styles.pagination}>
        {/* 이전 */}
        <Pressable
          onPress={() => page > 1 && onPage(page - 1)}
          disabled={page <= 1}
          style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
        >
          <Feather
            name="chevron-left"
            size={20}
            color={page <= 1 ? "#9ca3af" : "#111827"}
          />
        </Pressable>

        {/* 앞 그룹 */}
        {start > 1 && (
          <Pressable onPress={() => onPage(start - 1)} style={styles.pageBtn}>
            <Text style={styles.pageBtnText}>···</Text>
          </Pressable>
        )}

        {/* 페이지 번호 */}
        {pages.map((p) => (
          <Pressable
            key={p}
            onPress={() => onPage(p)}
            style={[styles.pageBtn, p === page && styles.pageBtnActive]}
          >
            <Text
              style={[
                styles.pageBtnText,
                p === page && styles.pageBtnTextActive,
              ]}
            >
              {p}
            </Text>
          </Pressable>
        ))}

        {/* 뒤 그룹 */}
        {end < totalPages && (
          <Pressable onPress={() => onPage(end + 1)} style={styles.pageBtn}>
            <Text style={styles.pageBtnText}>···</Text>
          </Pressable>
        )}

        {/* 다음 */}
        <Pressable
          onPress={() => page < totalPages && onPage(page + 1)}
          disabled={page >= totalPages}
          style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={page >= totalPages ? "#9ca3af" : "#111827"}
          />
        </Pressable>
      </View>
    );
  },
);

export default Pagination;

const styles = StyleSheet.create({
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  pageBtnActive: {
    backgroundColor: "#fde047",
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  pageBtnTextActive: {
    color: "#111827",
    fontWeight: "700",
  },
});
