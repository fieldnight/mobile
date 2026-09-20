/** Reassemble the firmware's existing SF chunks; never emit partial statistics. */
export function createNfcStatsAssembler() {
  let messageId = "";
  let nextPart = 0;
  let buffer = "";
  let lastFragment = "";
  return (text: string): string | null => {
    if (!text.startsWith("SF|")) {
      messageId = "";
      nextPart = 0;
      buffer = "";
      lastFragment = "";
      return text;
    }
    const match = /^SF\|([0-9A-F]{2})\|(\d{2})\|([01])\|([\s\S]*)$/.exec(text);
    if (!match) { messageId = ""; buffer = ""; return null; }
    if (text === lastFragment) return null; // firmware may retry an acknowledged chunk
    const [, id, partText, final, chunk] = match;
    const part = Number(partText);
    if (part === 0) { messageId = id; nextPart = 0; buffer = ""; }
    if (id !== messageId || part !== nextPart || buffer.length + chunk.length > 96) {
      messageId = "";
      buffer = "";
      return null;
    }
    buffer += chunk;
    nextPart++;
    lastFragment = text;
    if (final === "0") return null;
    const result = buffer;
    buffer = "";
    messageId = "";
    return result;
  };
}
