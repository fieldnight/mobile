/**
 * 상대 시간 변환 (방금 전, N분 전, N시간 전, N일 전, 날짜)
 */
export function formatRelativeTime(iso: string): string {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;

    const d = new Date(iso);
    return `${d.getMonth() + 1}.${d.getDate()}`;
  } catch {
    return "";
  }
}