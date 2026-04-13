import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";
import { getServerT } from "@workspace/i18n/server";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export async function createEmailVerificationEmailHtml(email: string, url: string, language?: string): Promise<string> {
	const t = await getServerT(language);
	const safeEmail = escapeHtml(email);
	const safeUrl = escapeHtml(url);

	return [
		'<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.6;">',
		`<h2 style="margin:0 0 12px;">${escapeHtml(t("serverAuth.email.changeEmail.title"))}</h2>`,
		`<p style="margin:0 0 16px;">${escapeHtml(
			t("serverAuth.email.changeEmail.paragraph", { email }),
		).replace(escapeHtml(email), `<strong>${safeEmail}</strong>`)}</p>`,
		`<p style="margin:0 0 20px;"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#a35b2c;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(t("serverAuth.email.changeEmail.button"))}</a></p>`,
		`<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(t("serverAuth.email.changeEmail.hint"))}</p>`,
		`<p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${safeUrl}</p>`,
		"</div>",
	].join("");
}

export async function createLinkProviderEmailHtml(
	email: string,
	providerLabel: string,
	url: string,
	language?: string,
): Promise<string> {
	const t = await getServerT(language);
	const safeURL = escapeHtml(url);

	return [
		'<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.6;">',
		`<h2 style="margin:0 0 12px;">${escapeHtml(
			t("serverAuth.email.linkProvider.title", { provider: providerLabel }),
		)}</h2>`,
		`<p style="margin:0 0 16px;">${escapeHtml(
			t("serverAuth.email.linkProvider.paragraph", { email, provider: providerLabel }),
		)}</p>`,
		`<p style="margin:0 0 20px;"><a href="${safeURL}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#a35b2c;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(
			t("serverAuth.email.linkProvider.button", { provider: providerLabel }),
		)}</a></p>`,
		`<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(t("serverAuth.email.linkProvider.hint"))}</p>`,
		`<p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${safeURL}</p>`,
		"</div>",
	].join("");
}

export async function createSetupPasswordEmailHtml(
	email: string,
	url: string,
	language?: string,
): Promise<string> {
	const t = await getServerT(language);
	const safeURL = escapeHtml(url);

	return [
		'<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.6;">',
		`<h2 style="margin:0 0 12px;">${escapeHtml(t("serverAuth.email.passwordSetup.title"))}</h2>`,
		`<p style="margin:0 0 16px;">${escapeHtml(
			t("serverAuth.email.passwordSetup.paragraph", { email }),
		)}</p>`,
		`<p style="margin:0 0 20px;"><a href="${safeURL}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#a35b2c;color:#ffffff;text-decoration:none;font-weight:700;">${escapeHtml(t("serverAuth.email.passwordSetup.button"))}</a></p>`,
		`<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">${escapeHtml(t("serverAuth.email.passwordSetup.hint"))}</p>`,
		`<p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${safeURL}</p>`,
		"</div>",
	].join("");
}

export async function sendAuthEmail(params: {
	html: string;
	subject: string;
	text: string;
	to: string;
}): Promise<boolean> {
	if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
		Logger.warn("Auth", "Auth email delivery is unavailable because Resend env vars are missing");
		return false;
	}

	const response = await fetch("https://api.resend.com/emails", {
		body: JSON.stringify({
			from: env.RESEND_FROM_EMAIL,
			html: params.html,
			subject: params.subject,
			text: params.text,
			to: [params.to],
		}),
		headers: {
			authorization: `Bearer ${env.RESEND_API_KEY}`,
			"content-type": "application/json",
		},
		method: "POST",
	});

	if (!response.ok) {
		Logger.error("Auth", "Failed to send auth email", {
			body: await response.text().catch(() => null),
			status: response.status,
		});
		return false;
	}

	return true;
}
