import React, { useEffect, useRef, useState } from "react";
import QRCodeStyling from "qr-code-styling";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function AuthLoginWithQrCode({ t }: { t: (key: string, value?: Record<string, string>) => React.ReactNode }) {
	const [qrCode, setQrCode] = useState<QRCodeStyling>();
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setQrCode(
			new QRCodeStyling({
				width: 250,
				height: 250,
				type: "svg",
				data: "https://www.google.com",
				image: "/q.ico",
				imageOptions: {
					hideBackgroundDots: true,
					margin: 4,
				},
				backgroundOptions: {
					color: "",
				},
				dotsOptions: {
					color: "",
					type: "rounded",
				},
				cornersSquareOptions: {
					type: "extra-rounded",
				},
			})
		);
	}, []);

	useEffect(() => {
		if (ref.current) {
			qrCode?.append(ref.current);
		}
	}, [qrCode, ref]);

	useEffect(() => {
		if (!qrCode) return;
		qrCode.update();
	}, [qrCode]);

	if (!qrCode)
		return (
			<div className="flex flex-col items-center gap-4 p-4">
				<Skeleton className="w-[250px] h-[250px]" />
				<h2 className="text-2xl font-semibold">{t("qrLoginTitle")}</h2>
				<p className="text-sm text-muted-foreground text-center">{t("qrLoginDescription")}</p>
			</div>
		);

	return (
		<div className="flex flex-col items-center gap-4 p-4">
			<div
				className="w-[250px] h-[250px] animate-in fade-in zoom-in fill-foreground"
				ref={ref}
				aria-label="QR code for login"
			/>
			<h2 className="text-2xl font-semibold">{t("qrLoginTitle")}</h2>
			<p className="text-sm text-muted-foreground text-center">{t("qrLoginDescription")}</p>
		</div>
	);
}

export function AuthLoginWithQrCode2() {
	const [qrCode, setQrCode] = useState<QRCodeStyling>();
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setQrCode(
			new QRCodeStyling({
				width: 250,
				height: 250,
				type: "svg",
				data: "https://www.google.com",
				image: "/q.png",
				imageOptions: {
					hideBackgroundDots: true,
					margin: 4,
				},
				backgroundOptions: {
					color: "",
				},
				dotsOptions: {
					color: "",
					type: "rounded",
				},
				cornersSquareOptions: {
					type: "extra-rounded",
				},
			})
		);
	}, []);

	useEffect(() => {
		if (ref.current) {
			qrCode?.append(ref.current);
		}
	}, [qrCode, ref]);

	useEffect(() => {
		if (!qrCode) return;
		qrCode.update();
	}, [qrCode]);

	if (!qrCode)
		return (
			<div className="flex flex-col items-center gap-4 p-4">
				<Skeleton className="w-[250px] h-[250px]" />
			</div>
		);

	return (
		<div className="flex flex-col items-center gap-4 p-4">
			<div
				className="w-[250px] h-[250px] animate-in fade-in zoom-in fill-foreground"
				ref={ref}
				aria-label="QR code for login"
			/>
		</div>
	);
}
