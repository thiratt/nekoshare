// import { Button } from "@workspace/ui/components/button";
// import { Card, CardContent } from "@workspace/ui/components/card";
// import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@workspace/ui/components/form";
// import { Input } from "@workspace/ui/components/input";
// import { useCallback } from "react";
// import { TransitionCard } from "@workspace/app-ui/components/transition-card";
// import { AuthLoginWithQrCode } from "@workspace/app-ui/components/auth/qr-auth";
// import { z } from "zod";
// import { useForm } from "react-hook-form";
// import { FaGoogle } from "react-icons/fa";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Checkbox } from "@workspace/ui/components/checkbox";

// import { TLoginSchema } from "../../types";
// // const useLoginFormSchema = () => {
// // 	const t = useTranslations("auth.formError");
// // 	return useMemo(
// // 		() =>
// // 			z.object({
// // 				email: z.string().email(t("email")).trim(),
// // 				password: z.string().min(8, t("password.short")).max(16, t("password.long")),
// // 				tempMode: z.boolean(),
// // 			}),
// // 		[t]
// // 	);
// // };

// const x = z.object({
// 	email: z.string().email("email").trim(),
// 	password: z.string().min(8, "password.short").max(16, "password.long"),
// 	tempMode: z.boolean(),
// });

// export function LoginCard({ onSubmit }: { onSubmit: (data: TLoginSchema) => Promise<void> }) {
// 	// const t = useTranslations();
// 	// const router = useZLink();
// 	// const { setGlobalLoading } = useSyncora();
// 	// const { refetch } = useToken();

// 	const form = useForm<TLoginSchema>({
// 		mode: "onChange",
// 		resolver: zodResolver(x),
// 		defaultValues: {
// 			email: "",
// 			password: "",
// 			tempMode: false,
// 		},
// 	});

// 	// const authMessage = (key: string, value?: Record<string, string>) => t(`auth.login.${key}`, { ...value });
// 	const authMessage = (key: string, value?: Record<string, string>) => key;

// 	// const onSubmit = useCallback(
// 	// 	async (data: TLoginSchema) => {
// 	// 		if (!true) {
// 	// 			toast.error(t("error.storeNotInitialized"));
// 	// 			return;
// 	// 		}

// 	// 		try {
// 	// 			const deviceId = await invoke("get_device_uid");
// 	// 			const deviceName = await invoke("get_device_name");

// 	// 			const res = await fetch(`${API_ENDPOINT}/auth/login`, {
// 	// 				method: "POST",
// 	// 				headers: {
// 	// 					"Content-Type": "application/json",
// 	// 				},
// 	// 				body: JSON.stringify({
// 	// 					email: data.email,
// 	// 					password: data.password,
// 	// 					deviceName: deviceName,
// 	// 					deviceUid: deviceId,
// 	// 					platform: platform(),
// 	// 					tempMode: data.tempMode,
// 	// 				}),
// 	// 			});

// 	// 			const body: ApiResponse<LoginResponse> = await res.json();

// 	// 			if (!res.ok) {
// 	// 				toast.error(body.error || t("error.loginFailed"));
// 	// 				return;
// 	// 			}
// 	// 			setGlobalLoading(true);

// 	// 			if (body.data?.account.isTwoFactor) {
// 	// 				router.push("/auth/2fa");
// 	// 				return;
// 	// 			}

// 	// 			await invoke("set_vault_key", { key: "access_token", value: body.data?.accessToken });
// 	// 			await invoke("set_vault_key", { key: "refresh_token", value: body.data?.refreshToken });
// 	// 			await refetch();
// 	// 			router.push("/home");
// 	// 		} catch {
// 	// 			toast.error(t("error.unexpected"));
// 	// 		}
// 	// 	},
// 	// 	[refetch, router, setGlobalLoading, t]
// 	// );

// 	const renderField = useCallback(
// 		(name: keyof TLoginSchema, label: string, type: string = "text") => (
// 			<FormField
// 				control={form.control}
// 				name={name}
// 				render={({ field }) => (
// 					<FormItem>
// 						<FormLabel className="flex justify-between">{label}</FormLabel>
// 						<FormControl>
// 							<Input type={type} {...field} value={typeof field.value === "string" ? field.value : ""} />
// 						</FormControl>
// 						<FormMessage />
// 					</FormItem>
// 				)}
// 			/>
// 		),
// 		[form.control]
// 	);

// 	return (
// 		<div className="space-y-4 w-full max-w-sm md:max-w-4xl">
// 			<Card className="shadow-xl">
// 				<Form {...form}>
// 					<form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="contents">
// 						<CardContent className="grid gap-8 grid-cols-[60%_auto]">
// 							<div className="flex flex-col gap-4">
// 								<header className="text-center">
// 									<h1 className="text-2xl font-semibold">Welcome</h1>
// 									<p className="text-muted-foreground">ZLink</p>
// 								</header>

// 								{renderField("email", authMessage("email"), "email")}
// 								{renderField("password", authMessage("password"), "password")}

// 								<FormField
// 									control={form.control}
// 									name="tempMode"
// 									render={({ field }) => (
// 										<FormItem className="flex items-center">
// 											<FormControl>
// 												<Checkbox checked={field.value} onCheckedChange={field.onChange} />
// 											</FormControl>
// 											<FormLabel>Temperature Mode</FormLabel>
// 										</FormItem>
// 									)}
// 								/>
// 								<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
// 									{authMessage("loginButton")}
// 								</Button>
// 								<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
// 									<span className="relative z-10 bg-card px-2 text-muted-foreground">
// 										{authMessage("orContinueWith")}
// 									</span>
// 								</div>
// 								<Button
// 									className="items-center justify-center"
// 									variant="outline"
// 									disabled={form.formState.isSubmitting}
// 								>
// 									<FaGoogle className="size-3" /> {authMessage("continueWithGoogle")}
// 								</Button>
// 								<div className="flex gap-1 justify-center items-center text-sm">
// 									<p>{authMessage("signUpPrompt")}</p>
// 									{/* <ZLink href="/auth/signup">{authMessage("signUpLink")}</ZLink> */}
// 								</div>
// 							</div>
// 							{/* <AuthLoginWithQrCode t={authMessage} /> */}
// 						</CardContent>
// 					</form>
// 				</Form>
// 			</Card>
// 			{/* <AuthFooter /> */}
// 		</div>
// 	);
// }
