/**
 * 전역 토스트 상태 관리 Context
 * - ToastProvider: 앱 루트에 감싸서 Toast 렌더링 + show/hide 제공
 * - useAppToast: 어느 컴포넌트에서든 show(message, type) 호출 가능
 * - type: "success" | "error" | "info" → Toast.tsx에서 아이콘/색상 결정
 */
import { createContext, useCallback, useContext, useState } from "react";
import { Toast } from "@/components/Toast";

type ToastType = "success" | "error" | "info";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const show = useCallback((message: string, type: ToastType = "success") => {
    setState({ visible: true, message, type });
  }, []);

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <Toast
        visible={state.visible}
        message={state.message}
        type={state.type}
        onHide={hide}
      />
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useAppToast must be used inside ToastProvider");
  return ctx;
}
