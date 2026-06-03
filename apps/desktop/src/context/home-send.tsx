import { createContext, type ReactNode, useContext } from "react";

type HomeSendContextValue = {
  onHomeSendToDevice: (files: string[], deviceId: string) => Promise<void>;
};

const HomeSendContext = createContext<HomeSendContextValue | null>(null);

export function HomeSendProvider({
  children,
  onHomeSendToDevice,
}: {
  children: ReactNode;
  onHomeSendToDevice: HomeSendContextValue["onHomeSendToDevice"];
}) {
  return (
    <HomeSendContext.Provider value={{ onHomeSendToDevice }}>
      {children}
    </HomeSendContext.Provider>
  );
}

export function useHomeSend() {
  const context = useContext(HomeSendContext);
  if (!context) {
    throw new Error("useHomeSend must be used within HomeSendProvider");
  }

  return context;
}
