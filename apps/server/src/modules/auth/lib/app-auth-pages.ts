import { normalizeLanguage } from "@workspace/i18n/core";
import { getServerT } from "@workspace/i18n/server";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export async function getStatusPageHtml(
	language: string | undefined,
	title: string,
	message: string,
	detail?: string,
): Promise<string> {
	const safeTitle = escapeHtml(title);
	const safeMessage = escapeHtml(message);
	const safeDetail = detail ? `<p style="margin:0;color:#6b7280;font-size:13px;">${escapeHtml(detail)}</p>` : "";
	const htmlLang = normalizeLanguage(language);

	return [
		"<!doctype html>",
		`<html lang="${htmlLang}">`,
		"<head>",
		'<meta charset="utf-8" />',
		'<meta name="viewport" content="width=device-width, initial-scale=1" />',
		`<title>${safeTitle}</title>`,
		"<style>",
		':root{color-scheme:light;font-family:"Segoe UI",Arial,sans-serif;background:#f8f5ee;color:#1f2937;}',
		"body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,rgba(221,180,128,.28),transparent 42%),linear-gradient(180deg,#fffaf3 0%,#f4ead8 100%);}",
		"main{width:min(520px,calc(100vw - 32px));padding:32px 28px;border-radius:24px;background:rgba(255,255,255,.94);box-shadow:0 24px 80px rgba(74,55,40,.14);border:1px solid rgba(125,89,58,.1);display:grid;gap:14px;}",
		"h1{margin:0;font-size:28px;line-height:1.15;}",
		"p{margin:0;line-height:1.6;color:#4b5563;}",
		"</style>",
		"</head>",
		"<body>",
		"<main>",
		`<h1>${safeTitle}</h1>`,
		`<p>${safeMessage}</p>`,
		safeDetail,
		"</main>",
		"</body>",
		"</html>",
	].join("");
}

export async function getPasswordSetupPageHtml(
	email: string,
	token: string,
	error?: string,
	language?: string,
): Promise<string> {
	const t = await getServerT(language);
	const safeEmail = escapeHtml(email);
	const safeToken = escapeHtml(token);
	const safeLanguage = language ? escapeHtml(normalizeLanguage(language)) : "";
	const errorBlock = error
		? `<p style="margin:0;padding:12px 14px;border-radius:14px;background:#fff1f2;color:#b91c1c;border:1px solid rgba(185,28,28,.16);">${escapeHtml(error)}</p>`
		: "";
	const htmlLang = normalizeLanguage(language);

	return [
		"<!doctype html>",
		`<html lang="${htmlLang}">`,
		"<head>",
		'<meta charset="utf-8" />',
		'<meta name="viewport" content="width=device-width, initial-scale=1" />',
		`<title>${escapeHtml(t("serverAuth.pages.passwordForm.title"))}</title>`,
		"<style>",
		':root{color-scheme:light;font-family:"Segoe UI",Arial,sans-serif;background:#f8f5ee;color:#1f2937;}',
		"body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,rgba(221,180,128,.28),transparent 42%),linear-gradient(180deg,#fffaf3 0%,#f4ead8 100%);}",
		"main{width:min(520px,calc(100vw - 32px));padding:32px 28px;border-radius:24px;background:rgba(255,255,255,.94);box-shadow:0 24px 80px rgba(74,55,40,.14);border:1px solid rgba(125,89,58,.1);display:grid;gap:16px;}",
		"h1{margin:0;font-size:28px;line-height:1.15;}",
		"p{margin:0;line-height:1.6;color:#4b5563;}",
		"label{display:grid;gap:8px;font-weight:600;color:#111827;}",
		"input{width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(107,114,128,.28);font:inherit;box-sizing:border-box;}",
		"button{padding:14px 18px;border:0;border-radius:14px;background:#a35b2c;color:#fff;font:inherit;font-weight:700;cursor:pointer;}",
		"button:hover{background:#8b4d24;}",
		"</style>",
		"</head>",
		"<body>",
		"<main>",
		`<h1>${escapeHtml(t("serverAuth.pages.passwordForm.title"))}</h1>`,
		`<p>${escapeHtml(t("serverAuth.pages.passwordForm.description", { email })).replace(escapeHtml(email), `<strong>${safeEmail}</strong>`)}</p>`,
		errorBlock,
		'<form method="post" action="/auth/app/password/setup" style="display:grid;gap:16px;">',
		`<input type="hidden" name="token" value="${safeToken}" />`,
		(safeLanguage ? `<input type="hidden" name="language" value="${safeLanguage}" />` : ""),
		`<label>${escapeHtml(t("serverAuth.pages.passwordForm.passwordLabel"))}<input type="password" name="newPassword" minlength="8" maxlength="128" autocomplete="new-password" required /></label>`,
		`<button type="submit">${escapeHtml(t("serverAuth.pages.passwordForm.submit"))}</button>`,
		"</form>",
		"</main>",
		"</body>",
		"</html>",
	].join("");
}
