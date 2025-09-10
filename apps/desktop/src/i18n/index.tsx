import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  // detect user language
  // learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  // for all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: true,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources: {
      en: {
        translation: {
          lorem:
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          theme: {
            light: "Light",
            dark: "Dark",
            system: "System",
          },
          noti: {
            button: "Notification",
            title: "Login Notification",
            body: "A login to your account was detected. If this wasn't you, please secure your account immediately.",
          },
        },
      },
      th: {
        translation: {
          lorem:
            "เนื้อหาตัวอย่างนี้ใช้สำหรับแสดงตัวอย่างการจัดวางข้อความในงานออกแบบ โดยไม่มีความหมายใดๆ ทั้งสิ้น ข้อความนี้มักใช้เพื่อทดสอบการแสดงผลของแบบอักษร การจัดวางเลย์เอาต์ และองค์ประกอบอื่นๆ ในงานออกแบบกราฟิกหรืองานพิมพ์ต่างๆ เพื่อให้เห็นภาพรวมของงานก่อนจะใส่เนื้อหาจริง",
          theme: {
            light: "สว่าง",
            dark: "มืด",
            system: "ระบบ",
          },
          noti: {
            button: "แจ้งเตือน",
            title: "แจ้งเตือนการเข้าสู่ระบบ (Login Alert)",
            body: "เราพบการเข้าสู่ระบบจากอุปกรณ์หรือสถานที่ใหม่ หากไม่ใช่คุณ โปรดตรวจสอบกิจกรรมบัญชีของคุณทันที",
          },
        },
      },
    },
  });

export default i18n;
