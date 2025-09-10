// src/utils/uaCheck.ts
export const isAllowedUA = () => {
  const ua = navigator.userAgent;
  const allowedSubstring = "NekoShare/0.0.1";
  return ua.includes(allowedSubstring);
};
