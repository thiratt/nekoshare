import { type ChangeEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { type Resolver, useForm } from "react-hook-form";
import { LuCamera, LuLoader } from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Slider } from "@workspace/ui/components/slider";
import { useToast } from "@workspace/ui/hooks/use-toast";

import { NTabs } from "@workspace/app-ui/components/ntab";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import {
	authClient,
	type AuthUserAccount,
	changeEmail,
	changePassword,
	deleteUser,
	getAccountActionErrorMessage,
	invalidateSessionCache,
	listUserAccounts,
	setPassword,
	updateUsername,
	updateUserProfile,
	uploadUserAvatar,
} from "@workspace/app-ui/lib/auth";
import { socketClient } from "@workspace/app-ui/lib/nk-socket";
import {
	ACCOUNT_AVATAR_MAX_FILE_SIZE_BYTES,
	ACCOUNT_AVATAR_OUTPUT_SIZE,
	ACCOUNT_DELETE_CONFIRMATION_PHRASE,
	ACCOUNT_DISPLAY_NAME_MAX_LENGTH,
	ACCOUNT_PASSWORD_MAX_LENGTH,
	ACCOUNT_PASSWORD_MIN_LENGTH,
	ACCOUNT_USERNAME_MAX_LENGTH,
	type ChangeEmailFormValues,
	changeEmailSchema,
	type ChangePasswordFormValues,
	changePasswordSchema,
	createDeleteAccountSchema,
	type DeleteAccountFormValues,
	type DisplayNameFormValues,
	displayNameSchema,
	type SetPasswordFormValues,
	setPasswordSchema,
	type UsernameFormValues,
	usernameSchema,
} from "@workspace/app-ui/schemas/account-settings";
import type { DialogKey, DialogState } from "@workspace/app-ui/types/settings";

const INITIAL_DIALOG_STATE: DialogState = {
	avatar: false,
	changeEmail: false,
	deleteAccount: false,
	changePassword: false,
	twoFaAuthentication: false,
};

const ACCOUNT_FIELD_WIDTH_CLASS = "w-full max-w-md";
const ACCOUNT_AVATAR_CROP_SOURCE_MAX_SIZE = 2048;
const ACCOUNT_AVATAR_CROP_SOURCE_QUALITY = 0.9;

function getUserInitials(name?: string | null): string {
	if (!name) {
		return "NK";
	}

	return name
		.split(" ")
		.map((part) => part[0] ?? "")
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function revokeObjectUrl(url: string | null) {
	if (url) {
		URL.revokeObjectURL(url);
	}
}

async function loadImage(src: string): Promise<HTMLImageElement> {
	return await new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Failed to load image"));
		image.src = src;
	});
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
	return await new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error("Failed to export canvas"));
					return;
				}

				resolve(blob);
			},
			type,
			quality,
		);
	});
}

function getContainedImageSize(
	width: number,
	height: number,
	maxSize: number,
): { height: number; width: number } | null {
	const largestSide = Math.max(width, height);
	if (largestSide <= maxSize) {
		return null;
	}

	const scale = maxSize / largestSide;
	return {
		height: Math.max(1, Math.round(height * scale)),
		width: Math.max(1, Math.round(width * scale)),
	};
}

async function createOptimizedAvatarSourceFromCanvasSource(
	source: CanvasImageSource,
	width: number,
	height: number,
): Promise<string | null> {
	const targetSize = getContainedImageSize(width, height, ACCOUNT_AVATAR_CROP_SOURCE_MAX_SIZE);
	if (!targetSize) {
		return null;
	}

	const canvas = document.createElement("canvas");
	canvas.width = targetSize.width;
	canvas.height = targetSize.height;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Canvas 2D context is not available");
	}

	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = "high";
	context.drawImage(source, 0, 0, width, height, 0, 0, targetSize.width, targetSize.height);

	const blob = await canvasToBlob(canvas, "image/webp", ACCOUNT_AVATAR_CROP_SOURCE_QUALITY);
	return URL.createObjectURL(blob);
}

async function createOptimizedAvatarSourceUrl(file: File): Promise<string> {
	if (typeof createImageBitmap === "function") {
		try {
			const bitmap = await createImageBitmap(file);
			try {
				const optimizedUrl = await createOptimizedAvatarSourceFromCanvasSource(bitmap, bitmap.width, bitmap.height);
				if (optimizedUrl) {
					return optimizedUrl;
				}
			} finally {
				bitmap.close();
			}
		} catch {
			// Fall back to the Image element path below.
		}
	}

	const sourceUrl = URL.createObjectURL(file);
	try {
		const image = await loadImage(sourceUrl);
		const optimizedUrl = await createOptimizedAvatarSourceFromCanvasSource(
			image,
			image.naturalWidth,
			image.naturalHeight,
		);

		if (optimizedUrl) {
			revokeObjectUrl(sourceUrl);
			return optimizedUrl;
		}

		return sourceUrl;
	} catch (error) {
		revokeObjectUrl(sourceUrl);
		throw error;
	}
}

function getRadianAngle(degreeValue: number): number {
	return (degreeValue * Math.PI) / 180;
}

function getRotatedSize(width: number, height: number, rotation: number): { height: number; width: number } {
	const rotRad = getRadianAngle(rotation);

	return {
		height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
		width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
	};
}

async function createCroppedAvatarBlob(
	imageSource: string,
	cropAreaPixels: Area,
	outputSize: number,
	rotation = 0,
): Promise<Blob> {
	const image = await loadImage(imageSource);
	const rotatedSize = getRotatedSize(image.naturalWidth, image.naturalHeight, rotation);
	const rotatedCanvas = document.createElement("canvas");
	rotatedCanvas.width = Math.round(rotatedSize.width);
	rotatedCanvas.height = Math.round(rotatedSize.height);

	const rotatedContext = rotatedCanvas.getContext("2d");
	if (!rotatedContext) {
		throw new Error("Canvas 2D context is not available");
	}

	rotatedContext.imageSmoothingEnabled = true;
	rotatedContext.imageSmoothingQuality = "high";
	rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
	rotatedContext.rotate(getRadianAngle(rotation));
	rotatedContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

	const canvas = document.createElement("canvas");
	canvas.width = outputSize;
	canvas.height = outputSize;

	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("Canvas 2D context is not available");
	}

	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = "high";
	context.drawImage(
		rotatedCanvas,
		Math.round(cropAreaPixels.x),
		Math.round(cropAreaPixels.y),
		Math.round(cropAreaPixels.width),
		Math.round(cropAreaPixels.height),
		0,
		0,
		outputSize,
		outputSize,
	);

	try {
		return await canvasToBlob(canvas, "image/webp", 0.92);
	} catch {
		return await canvasToBlob(canvas, "image/png");
	}
}

interface AvatarSaveOptions {
	signal?: AbortSignal;
}

interface AvatarDialogProps {
	avatarUrl?: string | null;
	onEscapeKeyDown?: (event: Event) => void;
	onOpenChange: (open: boolean) => void;
	onSave: (image: Blob, options?: AvatarSaveOptions) => Promise<void>;
	open: boolean;
	userInitials: string;
}

const AvatarDialog = memo(function AvatarDialog({
	avatarUrl,
	onEscapeKeyDown,
	onOpenChange,
	onSave,
	open,
	userInitials,
}: AvatarDialogProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const saveAbortControllerRef = useRef<AbortController | null>(null);
	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
	const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
	const [sourceUrl, setSourceUrl] = useState<string | null>(null);
	const [zoom, setZoom] = useState(1);
	const [isPreparingImage, setIsPreparingImage] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { toast } = useToast();

	const resetCropState = useCallback(() => {
		setCrop({ x: 0, y: 0 });
		setCropAreaPixels(null);
		setZoom(1);
	}, []);

	const resetDialogState = useCallback(() => {
		saveAbortControllerRef.current?.abort();
		saveAbortControllerRef.current = null;
		revokeObjectUrl(sourceUrl);
		setSourceUrl(null);
		resetCropState();
		setIsPreparingImage(false);
		setIsSaving(false);
	}, [resetCropState, sourceUrl]);

	useEffect(() => {
		if (!open) {
			resetDialogState();
		}
	}, [open, resetDialogState]);

	useEffect(() => {
		return () => {
			revokeObjectUrl(sourceUrl);
		};
	}, [sourceUrl]);

	useEffect(() => {
		return () => {
			saveAbortControllerRef.current?.abort();
		};
	}, []);

	const handleSelectFile = useCallback(
		async (event: ChangeEvent<HTMLInputElement>) => {
			const input = event.currentTarget;
			const file = input.files?.[0];
			if (!file) {
				return;
			}

			if (file.size > ACCOUNT_AVATAR_MAX_FILE_SIZE_BYTES) {
				toast.error("ขนาดไฟล์ต้องไม่เกิน 5 MB");
				input.value = "";
				return;
			}

			input.value = "";
			setIsPreparingImage(true);
			try {
				const nextSourceUrl = await createOptimizedAvatarSourceUrl(file);
				revokeObjectUrl(sourceUrl);
				setSourceUrl(nextSourceUrl);
				resetCropState();
			} catch {
				toast.error("ไม่สามารถเตรียมรูปภาพนี้ได้ กรุณาลองเลือกรูปอื่น");
			} finally {
				setIsPreparingImage(false);
			}
		},
		[resetCropState, sourceUrl, toast],
	);

	const handleBackToSelect = useCallback(() => {
		revokeObjectUrl(sourceUrl);
		setSourceUrl(null);
		resetCropState();
	}, [resetCropState, sourceUrl]);

	const handleSave = useCallback(async () => {
		if (!sourceUrl || !cropAreaPixels || isPreparingImage) {
			return;
		}

		const abortController = new AbortController();
		saveAbortControllerRef.current = abortController;
		setIsSaving(true);
		try {
			const croppedAvatar = await createCroppedAvatarBlob(sourceUrl, cropAreaPixels, ACCOUNT_AVATAR_OUTPUT_SIZE);
			if (abortController.signal.aborted) {
				return;
			}

			await onSave(croppedAvatar, { signal: abortController.signal });
			if (abortController.signal.aborted) {
				return;
			}

			toast.success("อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว");
			onOpenChange(false);
		} catch (error) {
			if (abortController.signal.aborted) {
				return;
			}

			toast.error(error instanceof Error ? error.message : "ไม่สามารถบันทึกรูปโปรไฟล์ได้");
		} finally {
			if (saveAbortControllerRef.current === abortController) {
				saveAbortControllerRef.current = null;
			}
			setIsSaving(false);
		}
	}, [cropAreaPixels, isPreparingImage, onOpenChange, onSave, sourceUrl, toast]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				onEscapeKeyDown={onEscapeKeyDown}
				className={
					sourceUrl
						? "max-w-[920px] overflow-hidden border bg-background text-foreground shadow-2xl sm:max-w-[920px]"
						: "max-w-md sm:max-w-md"
				}
			>
				{sourceUrl ? (
					<div className="flex flex-col gap-4">
						<DialogHeader>
							<DialogTitle>แก้ไขรูปโปรไฟล์</DialogTitle>
							<DialogDescription>ลากเพื่อปรับตำแหน่ง แล้วปรับระดับการซูม</DialogDescription>
						</DialogHeader>

						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
							<div
								className="relative isolate h-[clamp(280px,46dvh,420px)] w-full overflow-hidden rounded-lg border bg-muted"
								aria-busy={isSaving}
							>
								<Cropper
									image={sourceUrl}
									crop={crop}
									zoom={zoom}
									aspect={1}
									cropShape="round"
									showGrid
									minZoom={1}
									maxZoom={3}
									onCropChange={setCrop}
									onCropComplete={(_, pixels) => setCropAreaPixels(pixels)}
									onZoomChange={setZoom}
									style={{
										containerStyle: {
											alignItems: "center",
											bottom: 0,
											cursor: isSaving ? "wait" : "move",
											display: "flex",
											justifyContent: "center",
											left: 0,
											overflow: "hidden",
											pointerEvents: isSaving ? "none" : "auto",
											position: "absolute",
											right: 0,
											top: 0,
											touchAction: "none",
											userSelect: "none",
										},
										cropAreaStyle: {
											border: "2px solid rgba(255, 255, 255, 0.9)",
											boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
										},
									}}
								/>

								{isSaving && (
									<div className="absolute inset-0 z-50 flex h-full w-full items-center justify-center bg-background/80 px-4 backdrop-blur-[2px]">
										<div className="flex w-full max-w-56 flex-col items-center gap-3 rounded-lg p-4 text-center">
											<LuLoader className="size-5 animate-spin" aria-hidden="true" />
											<span className="text-sm font-medium">กำลังบันทึกรูป</span>
										</div>
									</div>
								)}

								<div className="absolute top-4 right-4 bottom-4 z-20 flex w-16 flex-col items-center gap-4 rounded-lg border bg-background/50 px-3 py-4 text-foreground shadow-lg backdrop-blur-md">
									<span className="text-xs font-medium">Zoom</span>
									<Slider
										orientation="vertical"
										value={[zoom]}
										min={1}
										max={3}
										step={0.05}
										disabled={isPreparingImage}
										className="min-h-56 flex-1"
										onValueChange={(values) => setZoom(values[0] ?? 1)}
									/>
									<span className="text-xs">{zoom.toFixed(1)}x</span>
								</div>
							</div>
						</div>

						<DialogFooter className="border-t px-6 py-4 sm:justify-start">
							<Button
								type="button"
								variant="ghost"
								disabled={isSaving || isPreparingImage}
								onClick={() => fileInputRef.current?.click()}
							>
								<LuCamera aria-hidden="true" />
								{isPreparingImage ? "กำลังเตรียมรูป..." : "เปลี่ยนรูปภาพ"}
							</Button>
							<div className="flex-1 justify-end gap-2 sm:flex">
								<Button
									type="button"
									variant="outline"
									disabled={isSaving || isPreparingImage}
									onClick={handleBackToSelect}
								>
									ย้อนกลับ
								</Button>
								<Button type="button" disabled={!cropAreaPixels || isSaving || isPreparingImage} onClick={handleSave}>
									{isSaving && <LuLoader className="size-4 animate-spin" aria-hidden="true" />}
									บันทึก
								</Button>
							</div>
						</DialogFooter>

						<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelectFile} />
					</div>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>เปลี่ยนรูปโปรไฟล์</DialogTitle>
							<DialogDescription>คลิกที่รูปเพื่ออัปโหลดภาพใหม่จากอุปกรณ์ของคุณ</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col items-center justify-center gap-4 py-2 text-center">
							<button
								type="button"
								className="size-64 overflow-hidden rounded-full transition-all duration-200 hover:brightness-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								onClick={() => fileInputRef.current?.click()}
							>
								<Avatar className="group h-full w-full">
									{avatarUrl && <AvatarImage src={avatarUrl} alt="รูปโปรไฟล์ปัจจุบัน" />}
									<AvatarFallback className="text-4xl">{userInitials}</AvatarFallback>
									<div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
										<LuCamera size={48} className="text-white" aria-hidden="true" />
										<span className="sr-only">เปลี่ยนรูปภาพ</span>
									</div>
								</Avatar>
							</button>

							<div className="space-y-1">
								<p className="text-sm font-medium">เลือกรูปจากอุปกรณ์ของคุณ</p>
								<p className="text-sm text-muted-foreground">รองรับไฟล์ภาพทั่วไปและขนาดสูงสุด 5 MB</p>
							</div>

							<Button
								type="button"
								variant="outline"
								disabled={isPreparingImage}
								onClick={() => fileInputRef.current?.click()}
							>
								{isPreparingImage ? "กำลังเตรียมรูป..." : "เลือกไฟล์รูปภาพ"}
							</Button>
						</div>

						<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelectFile} />

						<DialogFooter className="gap-2">
							<Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>
								ปิด
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
});

interface LocalSettingAccountContentProps {
	onDialogActive: (hasOpenDialog: boolean) => void;
}

export const SettingAccountContent = memo(function SettingAccountContent({
	onDialogActive,
}: LocalSettingAccountContentProps) {
	const { data: sessionData, isPending, refetch } = authClient.useSession();
	const { router, runBeforeSignOut, setGlobalLoading, setMode } = useNekoShare();
	const { toast } = useToast();

	const [dialogs, setDialogs] = useState<DialogState>(INITIAL_DIALOG_STATE);
	const [dialogStack, setDialogStack] = useState<DialogKey[]>([]);
	const [linkedAccounts, setLinkedAccounts] = useState<AuthUserAccount[] | null>(null);
	const [linkedAccountsError, setLinkedAccountsError] = useState<string | null>(null);
	const [isLoadingLinkedAccounts, setIsLoadingLinkedAccounts] = useState(false);

	const user = sessionData?.user;
	const username = user?.displayUsername ?? user?.username ?? null;
	const userInitials = useMemo(() => getUserInitials(user?.name), [user?.name]);
	const deleteConfirmationName = username ?? user?.name ?? user?.email ?? "";
	const topDialogKey = dialogStack.at(-1) ?? null;
	const hasOpenDialog = dialogStack.length > 0;
	const needsSensitiveAccounts = dialogs.changePassword || dialogs.deleteAccount;
	const hasCredentialAccount = useMemo(
		() => linkedAccounts?.some((account) => account.providerId === "credential") ?? null,
		[linkedAccounts],
	);
	const isSensitiveAccountStateReady = !isLoadingLinkedAccounts && linkedAccounts !== null;

	const displayNameForm = useForm<DisplayNameFormValues>({
		defaultValues: { displayName: user?.name ?? "" },
		resolver: zodResolver(displayNameSchema),
	});
	const usernameForm = useForm<UsernameFormValues>({
		defaultValues: { username: username ?? "" },
		resolver: zodResolver(usernameSchema),
	});
	const emailForm = useForm<ChangeEmailFormValues>({
		defaultValues: { confirmEmail: "", newEmail: "" },
		resolver: zodResolver(changeEmailSchema),
	});
	const changePasswordForm = useForm<ChangePasswordFormValues>({
		defaultValues: {
			confirmPassword: "",
			currentPassword: "",
			newPassword: "",
		},
		resolver: zodResolver(changePasswordSchema),
	});
	const setPasswordForm = useForm<SetPasswordFormValues>({
		defaultValues: { confirmPassword: "", newPassword: "" },
		resolver: zodResolver(setPasswordSchema),
	});
	const deleteAccountResolver = useCallback<Resolver<DeleteAccountFormValues>>(
		async (values, context, options) =>
			await zodResolver(createDeleteAccountSchema(deleteConfirmationName, hasCredentialAccount === true))(
				values,
				context,
				options,
			),
		[deleteConfirmationName, hasCredentialAccount],
	);
	const deleteAccountForm = useForm<DeleteAccountFormValues>({
		defaultValues: { password: "", phrase: "", username: "" },
		resolver: deleteAccountResolver,
	});

	const displayNameValue = displayNameForm.watch("displayName");
	const usernameValue = usernameForm.watch("username");

	const setDialogOpen = useCallback((key: DialogKey, open: boolean) => {
		setDialogs((previous) => ({
			...previous,
			[key]: open,
		}));
		setDialogStack((previous) =>
			open ? [...previous.filter((openKey) => openKey !== key), key] : previous.filter((openKey) => openKey !== key),
		);
	}, []);

	const handleDialogEscapeKeyDown = useCallback(
		(key: DialogKey, event: Event) => {
			event.preventDefault();
			event.stopPropagation();

			if (topDialogKey !== key) {
				return;
			}

			setDialogOpen(key, false);
		},
		[setDialogOpen, topDialogKey],
	);

	const refreshSession = useCallback(async () => {
		invalidateSessionCache();
		await refetch();
	}, [refetch]);

	const completeDeletedAccountTransition = useCallback(async () => {
		setGlobalLoading(true);

		try {
			try {
				await runBeforeSignOut();
			} catch (cleanupError) {
				console.error("Failed to run account deletion cleanup:", cleanupError);
			}

			socketClient.setAutoReconnect(false);
			socketClient.disconnect();
			invalidateSessionCache();

			try {
				await refetch();
			} catch (sessionError) {
				console.error("Failed to refetch session after account deletion:", sessionError);
			}

			setMode("home");
			router.navigate({ to: "/login" });
		} finally {
			setGlobalLoading(false);
		}
	}, [refetch, router, runBeforeSignOut, setGlobalLoading, setMode]);

	useEffect(() => {
		onDialogActive(hasOpenDialog);
	}, [hasOpenDialog, onDialogActive]);

	useEffect(() => {
		displayNameForm.reset({ displayName: user?.name ?? "" });
	}, [displayNameForm, user?.name]);

	useEffect(() => {
		usernameForm.reset({ username: username ?? "" });
	}, [username, usernameForm]);

	useEffect(() => {
		if (!dialogs.changeEmail) {
			emailForm.reset({ confirmEmail: "", newEmail: "" });
		}
	}, [dialogs.changeEmail, emailForm]);

	useEffect(() => {
		if (!dialogs.changePassword) {
			changePasswordForm.reset({
				confirmPassword: "",
				currentPassword: "",
				newPassword: "",
			});
			setPasswordForm.reset({ confirmPassword: "", newPassword: "" });
		}
	}, [changePasswordForm, dialogs.changePassword, setPasswordForm]);

	useEffect(() => {
		if (!dialogs.deleteAccount) {
			deleteAccountForm.reset({ password: "", phrase: "", username: "" });
		}
	}, [deleteAccountForm, dialogs.deleteAccount]);

	useEffect(() => {
		if (!needsSensitiveAccounts || !user?.id) {
			return;
		}

		let active = true;
		setIsLoadingLinkedAccounts(true);
		setLinkedAccounts(null);
		setLinkedAccountsError(null);

		void listUserAccounts()
			.then((result) => {
				if (!active) {
					return;
				}

				if (result.error) {
					const message = getAccountActionErrorMessage(
						result.error,
						"ไม่สามารถโหลดข้อมูลวิธีเข้าสู่ระบบของบัญชีนี้ได้",
					);
					toast.error(message);
					setLinkedAccountsError(message);
					return;
				}

				setLinkedAccounts(result.data ?? []);
			})
			.finally(() => {
				if (active) {
					setIsLoadingLinkedAccounts(false);
				}
			});

		return () => {
			active = false;
		};
	}, [needsSensitiveAccounts, toast, user?.id]);

	const handleSaveDisplayName = displayNameForm.handleSubmit(async (values) => {
		const nextName = values.displayName.trim();
		if (!nextName || nextName === (user?.name ?? "")) {
			return;
		}

		const result = await updateUserProfile({ name: nextName });
		if (result.error) {
			toast.error(getAccountActionErrorMessage(result.error, "ไม่สามารถบันทึกชื่อที่แสดงได้ กรุณาลองอีกครั้ง"));
			return;
		}

		await refreshSession();
		displayNameForm.reset({ displayName: nextName });
		toast.success("อัปเดตชื่อที่แสดงเรียบร้อยแล้ว");
	});

	const handleSaveUsername = usernameForm.handleSubmit(async (values) => {
		const nextUsername = values.username.trim();
		if (!nextUsername || nextUsername === (username ?? "")) {
			return;
		}

		const result = await updateUsername({
			displayUsername: nextUsername,
			username: nextUsername,
		});
		if (result.error) {
			toast.error(getAccountActionErrorMessage(result.error, "ไม่สามารถบันทึกชื่อผู้ใช้งานได้ กรุณาลองอีกครั้ง"));
			return;
		}

		await refreshSession();
		usernameForm.reset({ username: nextUsername });
		toast.success("อัปเดตชื่อผู้ใช้งานเรียบร้อยแล้ว");
	});

	const handleAvatarSave = useCallback(
		async (image: Blob, options: AvatarSaveOptions = {}) => {
			const result = await uploadUserAvatar(image, { signal: options.signal });
			if (options.signal?.aborted) {
				return;
			}

			if (result.error) {
				throw new Error(getAccountActionErrorMessage(result.error, "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้ กรุณาลองอีกครั้ง"));
			}

			if (options.signal?.aborted) {
				return;
			}

			await refreshSession();
		},
		[refreshSession],
	);

	const handleEmailChange = emailForm.handleSubmit(async (values) => {
		const nextEmail = values.newEmail.trim().toLowerCase();
		const currentEmail = user?.email?.trim().toLowerCase() ?? "";

		if (nextEmail === currentEmail) {
			emailForm.setError("newEmail", {
				message: "อีเมลใหม่ต้องไม่ตรงกับอีเมลปัจจุบัน",
			});
			return;
		}

		const result = await changeEmail({ newEmail: nextEmail });
		if (result.error) {
			toast.error(getAccountActionErrorMessage(result.error, "ไม่สามารถเริ่มการเปลี่ยนอีเมลได้ กรุณาลองอีกครั้ง"));
			return;
		}

		emailForm.reset({ confirmEmail: "", newEmail: "" });
		setDialogOpen("changeEmail", false);
		toast.success(`เราได้ส่งลิงก์ยืนยันไปที่ ${nextEmail} แล้ว`);
	});

	const handlePasswordSubmit = changePasswordForm.handleSubmit(async (values) => {
		const result = await changePassword({
			currentPassword: values.currentPassword,
			newPassword: values.newPassword,
			revokeOtherSessions: false,
		});

		if (result.error) {
			toast.error(getAccountActionErrorMessage(result.error, "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองอีกครั้ง"));
			return;
		}

		changePasswordForm.reset({
			confirmPassword: "",
			currentPassword: "",
			newPassword: "",
		});
		setDialogOpen("changePassword", false);
		toast.success("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
	});

	const handleSetPasswordSubmit = setPasswordForm.handleSubmit(async (values) => {
		const result = await setPassword({ newPassword: values.newPassword });

		if (result.error) {
			toast.error(getAccountActionErrorMessage(result.error, "ไม่สามารถตั้งรหัสผ่านได้ กรุณาลองอีกครั้ง"));
			return;
		}

		await refreshSession();
		setPasswordForm.reset({ confirmPassword: "", newPassword: "" });
		setDialogOpen("changePassword", false);
		toast.success("ตั้งรหัสผ่านเรียบร้อยแล้ว");
	});

	const handleDeleteAccount = deleteAccountForm.handleSubmit(async (values) => {
		if (!deleteConfirmationName) {
			toast.error("ไม่พบข้อมูลบัญชีสำหรับยืนยันการลบ");
			return;
		}

		const result = await deleteUser({
			password: hasCredentialAccount ? values.password : undefined,
		});

		if (result.error) {
			toast.error(getAccountActionErrorMessage(result.error, "ไม่สามารถลบบัญชีได้ กรุณาลองอีกครั้ง"));
			return;
		}

		await completeDeletedAccountTransition();
	});

	return (
		<div className="space-y-2 rounded-full">
			<NTabs
				defaultValue="general"
				listClassName="gap-1"
				items={[
					{
						value: "general",
						label: "ทั่วไป",
						content: (
							<ScrollArea className="h-[calc(100vh-14rem)]">
								<div className="space-y-4">
									<Card>
										<CardHeader className="flex flex-row justify-between space-y-0 gap-4">
											<div className="flex flex-col">
												<CardTitle>รูปโปรไฟล์</CardTitle>
												<CardDescription>
													นี่คือรูปโปรไฟล์ของคุณ
													<br />
													คลิกที่รูปเพื่ออัปโหลดรูปใหม่จากไฟล์ในอุปกรณ์ของคุณ
												</CardDescription>
											</div>

											<div className="shrink-0">
												{isPending ? (
													<Skeleton className="size-25 rounded-full" />
												) : (
													<button
														type="button"
														className="group relative size-24 overflow-hidden rounded-full transition-all duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
														aria-label="เปลี่ยนรูปโปรไฟล์"
														onClick={() => setDialogOpen("avatar", true)}
													>
														<Avatar className="h-full w-full">
															<AvatarImage
																src={user?.image ?? undefined}
																alt={`รูปโปรไฟล์ของ ${user?.name ?? "ผู้ใช้"}`}
															/>
															<AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
														</Avatar>

														<div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
															<LuCamera size={30} className="text-white" aria-hidden="true" />
														</div>
														<span className="sr-only">เปลี่ยนรูปโปรไฟล์</span>
													</button>
												)}
											</div>
										</CardHeader>
										<CardFooter className="border-t text-sm text-muted-foreground">
											รูปโปรไฟล์เป็นตัวเลือก แต่แนะนำให้เพิ่มไว้เพื่อให้ผู้อื่นจดจำคุณได้ง่าย
										</CardFooter>
									</Card>

									<Form {...displayNameForm}>
										<form onSubmit={handleSaveDisplayName}>
											<Card>
												<CardHeader>
													<CardTitle>ชื่อที่แสดง</CardTitle>
													<CardDescription>ชื่อที่แสดงจะปรากฏในโปรไฟล์และการแจ้งเตือนต่าง ๆ ของคุณ</CardDescription>
												</CardHeader>
												<CardContent>
													<FormField
														control={displayNameForm.control}
														name="displayName"
														render={({ field }) => (
															<FormItem className={ACCOUNT_FIELD_WIDTH_CLASS}>
																<FormControl>
																	<Input
																		{...field}
																		maxLength={ACCOUNT_DISPLAY_NAME_MAX_LENGTH}
																		autoComplete="name"
																		disabled={isPending || displayNameForm.formState.isSubmitting}
																		placeholder="ชื่อของคุณ"
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</CardContent>
												<CardFooter className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
													<p className="text-sm text-muted-foreground">ใช้ชื่อที่ผู้อื่นจดจำคุณได้ง่ายใน NekoShare</p>
													<Button
														type="submit"
														disabled={
															isPending ||
															displayNameForm.formState.isSubmitting ||
															!displayNameValue?.trim() ||
															displayNameValue.trim() === (user?.name ?? "")
														}
													>
														{displayNameForm.formState.isSubmitting && (
															<LuLoader className="animate-spin" aria-hidden="true" />
														)}
														บันทึก
													</Button>
												</CardFooter>
											</Card>
										</form>
									</Form>

									<Form {...usernameForm}>
										<form onSubmit={handleSaveUsername}>
											<Card>
												<CardHeader>
													<CardTitle>ชื่อผู้ใช้งาน</CardTitle>
													<CardDescription>
														ชื่อผู้ใช้งานช่วยให้ผู้อื่นค้นหาคุณได้ง่ายขึ้น และใช้สำหรับการยืนยันบางขั้นตอนของบัญชี
													</CardDescription>
												</CardHeader>
												<CardContent>
													<FormField
														control={usernameForm.control}
														name="username"
														render={({ field }) => (
															<FormItem className={ACCOUNT_FIELD_WIDTH_CLASS}>
																<FormControl>
																	<Input
																		{...field}
																		maxLength={ACCOUNT_USERNAME_MAX_LENGTH}
																		autoComplete="username"
																		disabled={isPending || usernameForm.formState.isSubmitting}
																		placeholder="username"
																	/>
																</FormControl>
																<FormDescription></FormDescription>
																<FormMessage />
															</FormItem>
														)}
													/>
												</CardContent>
												<CardFooter className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
													<p className="text-sm text-muted-foreground">
														ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข จุด และขีดล่าง ความยาวสูงสุด{" "}
														{ACCOUNT_USERNAME_MAX_LENGTH} ตัวอักษร
													</p>
													<Button
														type="submit"
														disabled={
															isPending ||
															usernameForm.formState.isSubmitting ||
															!usernameValue?.trim() ||
															usernameValue.trim() === (username ?? "")
														}
													>
														{usernameForm.formState.isSubmitting && (
															<LuLoader className="mr-2 size-4 animate-spin" aria-hidden="true" />
														)}
														บันทึก
													</Button>
												</CardFooter>
											</Card>
										</form>
									</Form>

									<Card>
										<CardHeader>
											<CardTitle>อีเมล</CardTitle>
											<CardDescription>
												อีเมลนี้ใช้สำหรับเข้าสู่ระบบ รับการแจ้งเตือนเกี่ยวกับบัญชี และยืนยันการเปลี่ยนแปลงสำคัญ
											</CardDescription>
										</CardHeader>
										<CardContent>
											<Input className={ACCOUNT_FIELD_WIDTH_CLASS} value={user?.email ?? ""} readOnly tabIndex={-1} />
										</CardContent>
										<CardFooter className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
											<p className="text-sm text-muted-foreground">
												เมื่อเปลี่ยนอีเมล เราจะส่งลิงก์ยืนยันไปยังอีเมลใหม่ก่อนใช้งานจริง
											</p>
											<Button type="button" onClick={() => setDialogOpen("changeEmail", true)}>
												เปลี่ยนอีเมล
											</Button>
										</CardFooter>
									</Card>

									<Card className="bg-destructive/5 dark:bg-destructive/20">
										<CardHeader className="text-destructive">
											<CardTitle>ลบบัญชี</CardTitle>
											<CardDescription className="text-muted-foreground">
												การลบบัญชีจะลบข้อมูลที่เกี่ยวข้องกับบัญชีนี้อย่างถาวร และไม่สามารถกู้คืนได้
											</CardDescription>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground">
												ก่อนดำเนินการ กรุณาตรวจสอบให้แน่ใจว่าคุณได้สำรองข้อมูลที่ต้องการเก็บไว้แล้ว
											</p>
										</CardContent>
										<CardFooter className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
											<p className="text-sm text-muted-foreground">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
											<Button variant="destructive" type="button" onClick={() => setDialogOpen("deleteAccount", true)}>
												ลบบัญชี
											</Button>
										</CardFooter>
									</Card>
								</div>
							</ScrollArea>
						),
					},
					{
						value: "security",
						label: "ความปลอดภัย",
						content: (
							<ScrollArea className="h-[calc(100vh-14rem)]">
								<div className="space-y-4">
									<Card>
										<CardHeader>
											<CardTitle>รหัสผ่าน</CardTitle>
											<CardDescription>
												ดูแลความปลอดภัยของบัญชีด้วยรหัสผ่านที่เดายาก และอัปเดตเมื่อจำเป็น
											</CardDescription>
										</CardHeader>
										<CardContent>
											<p className="text-sm text-muted-foreground">
												รหัสผ่านต้องมีอย่างน้อย {ACCOUNT_PASSWORD_MIN_LENGTH} ตัวอักษร และไม่เกิน{" "}
												{ACCOUNT_PASSWORD_MAX_LENGTH} ตัวอักษร
											</p>
										</CardContent>
										<CardFooter className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
											<p className="text-sm text-muted-foreground">
												หากคุณเข้าสู่ระบบด้วย social account อย่างเดียว สามารถตั้งรหัสผ่านเพิ่มได้จากหน้านี้
											</p>
											<Button type="button" onClick={() => setDialogOpen("changePassword", true)}>
												จัดการรหัสผ่าน
											</Button>
										</CardFooter>
									</Card>
								</div>
							</ScrollArea>
						),
					},
				]}
			/>

			<AvatarDialog
				open={dialogs.avatar}
				avatarUrl={user?.image}
				userInitials={userInitials}
				onEscapeKeyDown={(event) => handleDialogEscapeKeyDown("avatar", event)}
				onOpenChange={(open) => setDialogOpen("avatar", open)}
				onSave={handleAvatarSave}
			/>
			<Dialog open={dialogs.changeEmail} onOpenChange={(open) => setDialogOpen("changeEmail", open)}>
				<DialogContent
					className="max-w-xl"
					onEscapeKeyDown={(event) => handleDialogEscapeKeyDown("changeEmail", event)}
				>
					<DialogHeader>
						<DialogTitle>เปลี่ยนอีเมล</DialogTitle>
						<DialogDescription>
							กรอกอีเมลใหม่ของคุณ แล้วเราจะส่งลิงก์ยืนยันเพื่อให้การเปลี่ยนแปลงมีผลอย่างปลอดภัย
						</DialogDescription>
					</DialogHeader>

					<Form {...emailForm}>
						<form className="space-y-4" onSubmit={handleEmailChange}>
							<FormField
								control={emailForm.control}
								name="newEmail"
								render={({ field }) => (
									<FormItem>
										<FormLabel>อีเมลใหม่</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="email"
												autoComplete="email"
												disabled={emailForm.formState.isSubmitting}
												placeholder="name@example.com"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={emailForm.control}
								name="confirmEmail"
								render={({ field }) => (
									<FormItem>
										<FormLabel>ยืนยันอีเมลใหม่</FormLabel>
										<FormControl>
											<Input
												{...field}
												type="email"
												autoComplete="email"
												disabled={emailForm.formState.isSubmitting}
												placeholder="name@example.com"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter className="gap-2">
								<Button
									type="button"
									variant="outline"
									disabled={emailForm.formState.isSubmitting}
									onClick={() => setDialogOpen("changeEmail", false)}
								>
									ยกเลิก
								</Button>
								<Button type="submit" disabled={emailForm.formState.isSubmitting}>
									{emailForm.formState.isSubmitting && (
										<LuLoader className="mr-2 size-4 animate-spin" aria-hidden="true" />
									)}
									ส่งอีเมลยืนยัน
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			<Dialog open={dialogs.changePassword} onOpenChange={(open) => setDialogOpen("changePassword", open)}>
				<DialogContent
					className="max-w-xl"
					onEscapeKeyDown={(event) => handleDialogEscapeKeyDown("changePassword", event)}
				>
					<DialogHeader>
						<DialogTitle>{hasCredentialAccount === false ? "ตั้งรหัสผ่าน" : "เปลี่ยนรหัสผ่าน"}</DialogTitle>
						<DialogDescription>
							{hasCredentialAccount === false
								? "บัญชีนี้ยังไม่มีรหัสผ่าน คุณสามารถตั้งรหัสผ่านเพื่อใช้เข้าสู่ระบบแบบ credential ได้"
								: "กรอกรหัสผ่านปัจจุบันและตั้งรหัสผ่านใหม่เพื่ออัปเดตความปลอดภัยของบัญชี"}
						</DialogDescription>
					</DialogHeader>

					{isLoadingLinkedAccounts ? (
						<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
							<LuLoader className="mr-2 size-4 animate-spin" aria-hidden="true" />
							กำลังโหลดข้อมูลวิธีเข้าสู่ระบบ...
						</div>
					) : linkedAccountsError ? (
						<p className="py-4 text-sm text-destructive">{linkedAccountsError}</p>
					) : !isSensitiveAccountStateReady ? (
						<p className="py-4 text-sm text-destructive">ไม่สามารถตรวจสอบสถานะรหัสผ่านของบัญชีนี้ได้</p>
					) : hasCredentialAccount ? (
						<Form {...changePasswordForm}>
							<form className="space-y-4" onSubmit={handlePasswordSubmit}>
								<FormField
									control={changePasswordForm.control}
									name="currentPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>รหัสผ่านปัจจุบัน</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="password"
													autoComplete="current-password"
													disabled={changePasswordForm.formState.isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={changePasswordForm.control}
									name="newPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>รหัสผ่านใหม่</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="password"
													autoComplete="new-password"
													disabled={changePasswordForm.formState.isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={changePasswordForm.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>ยืนยันรหัสผ่านใหม่</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="password"
													autoComplete="new-password"
													disabled={changePasswordForm.formState.isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<DialogFooter className="gap-2">
									<Button
										type="button"
										variant="outline"
										disabled={changePasswordForm.formState.isSubmitting}
										onClick={() => setDialogOpen("changePassword", false)}
									>
										ยกเลิก
									</Button>
									<Button type="submit" disabled={changePasswordForm.formState.isSubmitting}>
										{changePasswordForm.formState.isSubmitting && (
											<LuLoader className="mr-2 size-4 animate-spin" aria-hidden="true" />
										)}
										บันทึกรหัสผ่านใหม่
									</Button>
								</DialogFooter>
							</form>
						</Form>
					) : (
						<Form {...setPasswordForm}>
							<form className="space-y-4" onSubmit={handleSetPasswordSubmit}>
								<FormField
									control={setPasswordForm.control}
									name="newPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>รหัสผ่านใหม่</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="password"
													autoComplete="new-password"
													disabled={setPasswordForm.formState.isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={setPasswordForm.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>ยืนยันรหัสผ่านใหม่</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="password"
													autoComplete="new-password"
													disabled={setPasswordForm.formState.isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<DialogFooter className="gap-2">
									<Button
										type="button"
										variant="outline"
										disabled={setPasswordForm.formState.isSubmitting}
										onClick={() => setDialogOpen("changePassword", false)}
									>
										ยกเลิก
									</Button>
									<Button type="submit" disabled={setPasswordForm.formState.isSubmitting}>
										{setPasswordForm.formState.isSubmitting && (
											<LuLoader className="mr-2 size-4 animate-spin" aria-hidden="true" />
										)}
										ตั้งรหัสผ่าน
									</Button>
								</DialogFooter>
							</form>
						</Form>
					)}
				</DialogContent>
			</Dialog>

			<Dialog open={dialogs.deleteAccount} onOpenChange={(open) => setDialogOpen("deleteAccount", open)}>
				<DialogContent
					className="max-w-xl"
					onEscapeKeyDown={(event) => handleDialogEscapeKeyDown("deleteAccount", event)}
				>
					<DialogHeader>
						<DialogTitle>ลบบัญชี</DialogTitle>
						<DialogDescription>
							ยืนยันด้วยชื่อผู้ใช้ ข้อความ <strong>{ACCOUNT_DELETE_CONFIRMATION_PHRASE}</strong>
							{hasCredentialAccount ? " และรหัสผ่านปัจจุบัน" : ""} เพื่อดำเนินการลบบัญชีแบบถาวร
						</DialogDescription>
					</DialogHeader>

					{isLoadingLinkedAccounts ? (
						<div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
							<LuLoader className="mr-2 size-4 animate-spin" aria-hidden="true" />
							กำลังโหลดข้อมูลวิธีเข้าสู่ระบบ...
						</div>
					) : linkedAccountsError ? (
						<p className="py-4 text-sm text-destructive">{linkedAccountsError}</p>
					) : !isSensitiveAccountStateReady ? (
						<p className="py-4 text-sm text-destructive">ไม่สามารถตรวจสอบสถานะบัญชีสำหรับการลบได้</p>
					) : (
						<Form {...deleteAccountForm}>
							<form className="space-y-4" onSubmit={handleDeleteAccount}>
								<FormField
									control={deleteAccountForm.control}
									name="username"
									render={({ field }) => (
										<FormItem>
											<FormLabel>พิมพ์ชื่อผู้ใช้ {deleteConfirmationName || "-"}</FormLabel>
											<FormControl>
												<Input {...field} autoComplete="off" disabled={deleteAccountForm.formState.isSubmitting} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={deleteAccountForm.control}
									name="phrase"
									render={({ field }) => (
										<FormItem>
											<FormLabel>พิมพ์ข้อความยืนยัน</FormLabel>
											<FormControl>
												<Input
													{...field}
													autoComplete="off"
													disabled={deleteAccountForm.formState.isSubmitting}
													placeholder={ACCOUNT_DELETE_CONFIRMATION_PHRASE}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{hasCredentialAccount && (
									<FormField
										control={deleteAccountForm.control}
										name="password"
										render={({ field }) => (
											<FormItem>
												<FormLabel>รหัสผ่านปัจจุบัน</FormLabel>
												<FormControl>
													<Input
														{...field}
														type="password"
														autoComplete="current-password"
														disabled={deleteAccountForm.formState.isSubmitting}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}

								{!hasCredentialAccount && (
									<p className="text-sm text-muted-foreground">
										หากเซสชันของคุณเก่าเกินไป ระบบอาจให้เข้าสู่ระบบใหม่ก่อนจึงจะลบบัญชีได้
									</p>
								)}

								<DialogFooter className="gap-2">
									<Button
										type="button"
										variant="outline"
										disabled={deleteAccountForm.formState.isSubmitting}
										onClick={() => setDialogOpen("deleteAccount", false)}
									>
										ยกเลิก
									</Button>
									<Button type="submit" variant="destructive" disabled={deleteAccountForm.formState.isSubmitting}>
										{deleteAccountForm.formState.isSubmitting && (
											<LuLoader className="mr-2 size-4 animate-spin" aria-hidden="true" />
										)}
										ลบบัญชีถาวร
									</Button>
								</DialogFooter>
							</form>
						</Form>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
});
