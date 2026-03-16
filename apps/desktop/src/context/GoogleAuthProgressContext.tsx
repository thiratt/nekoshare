import { createContext, type ReactNode, useContext, useState } from "react";

import { GoogleAuthProgressDialog } from "@/components/google-auth-progress-dialog";
import { cancelPendingGoogleAuthSignIn } from "@/lib/google-auth";

interface GoogleAuthProgressContextValue {
  hideGoogleAuthProgress: () => void;
  showGoogleAuthProgress: () => void;
}

const GoogleAuthProgressContext =
  createContext<GoogleAuthProgressContextValue | null>(null);

interface GoogleAuthProgressProviderProps {
  children: ReactNode;
}

export function GoogleAuthProgressProvider({
  children,
}: GoogleAuthProgressProviderProps) {
  const [open, setOpen] = useState(false);
  const hideGoogleAuthProgress = () => setOpen(false);
  const showGoogleAuthProgress = () => setOpen(true);
  const cancelGoogleAuthProgress = async () => {
    setOpen(false);
    await cancelPendingGoogleAuthSignIn().catch(() => undefined);
  };

  return (
    <GoogleAuthProgressContext.Provider
      value={{
        hideGoogleAuthProgress,
        showGoogleAuthProgress,
      }}
    >
      {children}
      <GoogleAuthProgressDialog
        open={open}
        onCancel={cancelGoogleAuthProgress}
      />
    </GoogleAuthProgressContext.Provider>
  );
}

export function useGoogleAuthProgress() {
  const context = useContext(GoogleAuthProgressContext);

  if (!context) {
    throw new Error(
      "useGoogleAuthProgress must be used within GoogleAuthProgressProvider",
    );
  }

  return context;
}
