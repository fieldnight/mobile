/**
 * 전역 토스트 상태 관리 Context
 * - ToastProvider: 앱 루트에 감싸서 Toast 렌더링 + show/hide 제공
 * - useAppToast: 어느 컴포넌트에서든 show(message, type) 호출 가능
 * - ToastOutlet: Modal(바텀시트 등) 안에 두면, 열려 있는 동안 토스트를 그 Modal 위에 그립니다.
 *   Modal은 별도 창이라 루트 토스트가 가려지기 때문입니다. 가장 나중에 열린 Outlet 하나만 그립니다.
 * - type: "success" | "error" | "info" → Toast.tsx에서 아이콘/색상 결정
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toast } from "@/components/Toast";

type ToastType = "success" | "error" | "info";

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, duration?: number) => void;
}

interface ToastHostValue {
  state: ToastState;
  hide: () => void;
  outlets: number[];
  register: () => { id: number; unregister: () => void };
}

const ToastContext = createContext<ToastContextValue | null>(null);
const ToastHostContext = createContext<ToastHostValue | null>(null);
// Outlet 등록 id를 만들 때만 씁니다.
let nextOutletId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });
  const [outlets, setOutlets] = useState<number[]>([]);

  const show = useCallback((message: string, type: ToastType = "success", duration?: number) => {
    setState({ visible: true, message, type, duration });
  }, []);

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const register = useCallback(() => {
    const id = nextOutletId++;
    setOutlets((current) => [...current, id]);
    return { id, unregister: () => setOutlets((current) => current.filter((item) => item !== id)) };
  }, []);

  const toastValue = useMemo(() => ({ show }), [show]);
  const hostValue = useMemo(() => ({ state, hide, outlets, register }), [state, hide, outlets, register]);

  return (
    <ToastContext.Provider value={toastValue}>
      <ToastHostContext.Provider value={hostValue}>
        {children}
        {outlets.length === 0 ? (
          <Toast
            visible={state.visible}
            message={state.message}
            type={state.type}
            duration={state.duration}
            onHide={hide}
          />
        ) : null}
      </ToastHostContext.Provider>
    </ToastContext.Provider>
  );
}

/** Modal 안에서 토스트를 대신 그리는 자리. 마운트돼 있는 동안 루트 토스트는 숨깁니다. */
export function ToastOutlet() {
  const host = useContext(ToastHostContext);
  const [id, setId] = useState<number | null>(null);
  const register = host?.register;

  useEffect(() => {
    if (!register) return;
    const outlet = register();
    setId(outlet.id);
    return outlet.unregister;
  }, [register]);

  if (!host || id == null || host.outlets[host.outlets.length - 1] !== id) return null;
  return (
    <Toast
      inline
      visible={host.state.visible}
      message={host.state.message}
      type={host.state.type}
      duration={host.state.duration}
      onHide={host.hide}
    />
  );
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useAppToast must be used inside ToastProvider");
  return ctx;
}
