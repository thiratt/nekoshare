import { Button } from "@workspace/ui/components/button";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/libs/theme-provider";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

const languages = {
  en: { nativeName: "English" },
  th: { nativeName: "ไทย" },
} as const;

type LanguageKey = keyof typeof languages;

export function DemoUi() {
  const { t, i18n } = useTranslation();
  const [permission, setPermission] = useState<boolean>(false);
  const { setTheme } = useTheme();

  const handleLanguageChange = useCallback(
    (lng: LanguageKey) => () => {
      i18n.changeLanguage(lng);
    },
    [i18n],
  );

  useEffect(() => {
    const checkAndNotify = async () => {
      let permissionGranted = await isPermissionGranted();

      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
        setPermission(permissionGranted);
        return;
      }

      // setPermission(true);
    };

    checkAndNotify();
  }, []);

  return (
    <section className="flex max-w-xl flex-col gap-4 justify-center items-center text-center px-4">
      <p className="text-lg">{t("lorem")}</p>
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-4">
          {(Object.keys(languages) as LanguageKey[]).map((lng) => (
            <Button
              key={lng}
              onClick={handleLanguageChange(lng)}
              aria-label={`Change language to ${languages[lng].nativeName}`}
            >
              {languages[lng].nativeName}
            </Button>
          ))}
        </div>
        <div className="flex gap-4">
          <Button onClick={() => setTheme("light")}>{t("theme.light")}</Button>
          <Button onClick={() => setTheme("dark")}>{t("theme.dark")}</Button>
          <Button onClick={() => setTheme("system")}>
            {t("theme.system")}
          </Button>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={() => {
              if (permission) {
                sendNotification({
                  title: t("noti.title"),
                  body: t("noti.body"),
                });
              }
            }}
          >
            {t("noti.button")} {!permission && "(No permission)"}
          </Button>
        </div>
      </div>
    </section>
  );
}
