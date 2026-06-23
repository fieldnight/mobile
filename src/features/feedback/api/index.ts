import { api } from "@/lib/api";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface SubmitSuggestionRequest {
  email: string;
  content: string;
}

export async function submitSuggestion({
  email,
  content,
}: SubmitSuggestionRequest): Promise<string> {
  console.log("[Feedback API] 문의 전송 요청", {
    email,
    contentLength: content.length,
    lineCount: content.split("\n").length,
  });

  try {
    const res = await api.post<ApiResponse<string>>("/api/v1/suggestions", {
      email,
      content,
    });

    if (String(res.data?.code ?? res.status) !== "200") {
      throw new Error(res.data?.message || "문의 전송에 실패했습니다.");
    }

    console.log("[Feedback API] 문의 전송 응답", {
      status: res.status,
      code: res.data?.code,
      message: res.data?.message,
      data: res.data?.data,
    });

    return res.data?.data ?? "OK";
  } catch (error) {
    console.error("[Feedback API] 문의 전송 실패", { error });
    throw error;
  }
}
