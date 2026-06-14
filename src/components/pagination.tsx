/**
 * 공용 페이지네이션 컴포넌트
 *
 * 사용법:
 * <Pagination page={page} totalPages={totalPages} onPage={setPage} />
 */

import { memo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { PretendardFont } from "@/components/PretendardFont";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  groupSize?: number;
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

        {start > 1 && (
          <Pressable onPress={() => onPage(start - 1)} style={styles.pageBtn}>
            <PretendardFont weight="medium" style={styles.pageBtnText}>···</PretendardFont>
          </Pressable>
        )}

        {pages.map((p) => (
          <Pressable
            key={p}
            onPress={() => onPage(p)}
            style={[styles.pageBtn, p === page && styles.pageBtnActive]}
          >
            <PretendardFont
              weight={p === page ? "bold" : "medium"}
              style={[styles.pageBtnText, p === page && styles.pageBtnTextActive]}
            >
              {p}
            </PretendardFont>
          </Pressable>
        ))}

        {end < totalPages && (
          <Pressable onPress={() => onPage(end + 1)} style={styles.pageBtn}>
            <PretendardFont weight="medium" style={styles.pageBtnText}>···</PretendardFont>
          </Pressable>
        )}

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
    color: "#6b7280",
  },
  pageBtnTextActive: {
    color: "#111827",
  },
});
