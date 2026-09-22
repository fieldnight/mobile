/**
 * 공용 페이지네이션 컴포넌트
 *
 * 사용법:
 * <Pagination page={page} totalPages={totalPages} onPage={setPage} />
 */

import { memo } from "react";
import { View, Pressable } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { PretendardFont } from "@/components/PretendardFont";
import { C } from "@/constants/hive-colors";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  groupSize?: number;
  size?: "default" | "large";
}

const Pagination = memo(
  ({ page, totalPages, onPage, groupSize = 5, size = "default" }: PaginationProps) => {
    if (totalPages <= 1) return null;
    const isLarge = size === "large";
    const buttonClassName = `${isLarge ? "h-11 w-11" : "h-9 w-9"} items-center justify-center rounded-lg`;

    const group = Math.floor((page - 1) / groupSize);
    const start = group * groupSize + 1;
    const end = Math.min(start + groupSize - 1, totalPages);
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    return (
      <View className="flex-row items-center justify-center gap-1 py-2">
        <Pressable
          onPress={() => page > 1 && onPage(page - 1)}
          disabled={page <= 1}
          className={`${buttonClassName} ${
            page <= 1 ? "opacity-40" : ""
          }`}
        >
          <Feather
            name="chevron-left"
            size={isLarge ? 24 : 20}
            color={page <= 1 ? C.ter : C.text}
          />
        </Pressable>

        {start > 1 && (
          <Pressable
            onPress={() => onPage(start - 1)}
            className={buttonClassName}
          >
            <PretendardFont weight="medium" style={{ fontSize: isLarge ? 17 : 14, color: C.sec }}>
              ···
            </PretendardFont>
          </Pressable>
        )}

        {pages.map((p) => (
          <Pressable
            key={p}
            onPress={() => onPage(p)}
            className={buttonClassName}
            style={{ backgroundColor: p === page ? C.primary : "transparent" }}
          >
            <PretendardFont
              weight={p === page ? "bold" : "medium"}
              style={{ fontSize: isLarge ? 17 : 14, color: p === page ? C.white : C.sec }}
            >
              {p}
            </PretendardFont>
          </Pressable>
        ))}

        {end < totalPages && (
          <Pressable
            onPress={() => onPage(end + 1)}
            className={buttonClassName}
          >
            <PretendardFont weight="medium" style={{ fontSize: isLarge ? 17 : 14, color: C.sec }}>
              ···
            </PretendardFont>
          </Pressable>
        )}

        <Pressable
          onPress={() => page < totalPages && onPage(page + 1)}
          disabled={page >= totalPages}
          className={`${buttonClassName} ${
            page >= totalPages ? "opacity-40" : ""
          }`}
        >
          <Feather
            name="chevron-right"
            size={isLarge ? 24 : 20}
            color={page >= totalPages ? C.ter : C.text}
          />
        </Pressable>
      </View>
    );
  },
);

export default Pagination;
