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

const SUGGESTION_ENDPOINT = "/api/v1/suggestions";

export async function submitSuggestion({
  email,
  content,
}: SubmitSuggestionRequest): Promise<string> {
  const body = {
    email: email.trim(),
    content: content.trim(),
  };

  console.log("[Feedback API] 피드백 제출 요청", {
    contentLength: body.content.length,
  });

  try {
    const response = await api.post<ApiResponse<string>>(
      SUGGESTION_ENDPOINT,
      body,
    );

    console.log("[Feedback API] 피드백 제출 성공", {
      status: response.status,
      message: response.data?.message,
    });

    return response.data?.data ?? "OK";
  } catch (error) {
    console.log("[Feedback API] 피드백 제출 에러", { error });
    throw new Error("피드백 제출에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }
}
