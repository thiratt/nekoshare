import { env } from "@/config/env";
import { Logger } from "@/infrastructure/logger";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function createEmailVerificationEmailHtml(email: string, url: string): string {
	const safeEmail = escapeHtml(email);
	const safeUrl = escapeHtml(url);

	return [
		'<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.6;">',
		'<h2 style="margin:0 0 12px;">Verify your new Nekoshare email</h2>',
		`<p style="margin:0 0 16px;">Confirm that <strong>${safeEmail}</strong> should become the new email for your Nekoshare account.</p>`,
		`<p style="margin:0 0 20px;"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#a35b2c;color:#ffffff;text-decoration:none;font-weight:700;">Verify email</a></p>`,
		'<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button does not work, open this link:</p>',
		`<p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${safeUrl}</p>`,
		"</div>",
	].join("");
}

export function createLinkProviderEmailHtml(email: string, providerLabel: string, url: string): string {
	const safeEmail = escapeHtml(email);
	const safeProvider = escapeHtml(providerLabel);
	const safeURL = escapeHtml(url);

	return [
		'<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.6;">',
		`<h2 style="margin:0 0 12px;">Confirm ${safeProvider} sign-in</h2>`,
		`<p style="margin:0 0 16px;">We found an existing Nekoshare account for ${safeEmail}. Confirm this link to continue with ${safeProvider}.</p>`,
		`<p style="margin:0 0 20px;"><a href="${safeURL}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#a35b2c;color:#ffffff;text-decoration:none;font-weight:700;">Link ${safeProvider}</a></p>`,
		'<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button does not work, open this link:</p>',
		`<p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${safeURL}</p>`,
		"</div>",
	].join("");
}

export function createSetupPasswordEmailHtml(email: string, url: string): string {
	const safeEmail = escapeHtml(email);
	const safeURL = escapeHtml(url);

	return [
		'<div style="font-family:Segoe UI,Arial,sans-serif;color:#1f2937;line-height:1.6;">',
		'<h2 style="margin:0 0 12px;">Set your Nekoshare password</h2>',
		`<p style="margin:0 0 16px;">Use this secure link to set or reset the password for ${safeEmail}.</p>`,
		`<p style="margin:0 0 20px;"><a href="${safeURL}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#a35b2c;color:#ffffff;text-decoration:none;font-weight:700;">Set password</a></p>`,
		'<p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button does not work, open this link:</p>',
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
