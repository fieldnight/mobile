import { useState } from "react";

export const HEADER_HEIGHT = 56;

export function useScrollHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  return {
    isScrolled,
    onScroll: ({ nativeEvent }: any) =>
      setIsScrolled(nativeEvent.contentOffset.y > 8),
    scrollEventThrottle: 16 as const,
  };
}
