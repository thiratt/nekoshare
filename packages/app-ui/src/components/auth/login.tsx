import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";
import { zodResolver } from "@hookform/resolvers/zod";

import { ExtendLink } from "../link";
import { TLoginSchema } from "@workspace/app-ui/types/schema";
import { IncludeLinkComponentProps } from "@workspace/app-ui/types/index";
import { CardTransition } from "../transition-view";
import { loginFormSchema } from "@workspace/app-ui/libs/schemas";
import { Loader } from "lucide-react";

interface ExampleDataLoginProps {
	identifier: string;
	password: string;
}

interface LoginCardProps extends IncludeLinkComponentProps {
	data?: ExampleDataLoginProps;
	onGoogle: () => Promise<void>;
	onSubmit: (data: TLoginSchema) => Promise<void>;
}

export function LoginCard({ data: exampleData, linkComponent, onGoogle, onSubmit }: LoginCardProps) {
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const form = useForm<TLoginSchema>({
		mode: "onChange",
		resolver: zodResolver(loginFormSchema),
		defaultValues: {
			identifier: exampleData ? exampleData.identifier : "",
			password: exampleData ? exampleData.password : "",
		},
	});

	// const authMessage = (key: string, value?: Record<string, string>) => t(`auth.login.${key}`, { ...value });
	const authMessage = (key: string) => key;

	const renderField = useCallback(
		(name: keyof TLoginSchema, label: string, type: string = "text") => (
			<FormField
				control={form.control}
				name={name}
				render={({ field }) => (
					<FormItem>
						<div className={name === "password" ? "flex justify-between" : ""}>
							<FormLabel>{label}</FormLabel>
							{name === "password" && (
								<ExtendLink
									className="underline-offset-3 text-sm"
									linkComponent={linkComponent}
									href="/auth/reset-pwd"
									tabIndex={-1}
								>
									ลืมรหัสผ่าน?
								</ExtendLink>
							)}
						</div>
						<FormControl>
							<Input
								type={type}
								{...field}
								value={typeof field.value === "string" ? field.value : ""}
								disabled={form.formState.isSubmitting}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		),
		[form.control]
	);

	return (
		<div className="space-y-4 w-full max-w-sm md:max-w-4xl">
			<CardTransition className="shadow-xl" tag="auth-card">
				<CardHeader>
					<CardTitle className="text-2xl font-semibold">เข้าสู่ระบบ</CardTitle>
					<CardDescription>ยินดีต้อนรับกลับมา!</CardDescription>
				</CardHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="contents">
						<CardContent className="space-y-4">
							<div className="flex flex-col gap-4">
								{renderField("identifier", "อีเมลหรือชื่อผู้ใช้งาน")}
								{renderField("password", "รหัสผ่าน", "password")}

								<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
									{!form.formState.isSubmitting ? (
										authMessage("เข้าสู่ระบบ")
									) : (
										<Loader className="animate-spin" />
									)}
								</Button>
								<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
									<span className="relative z-10 bg-card px-2 text-muted-foreground uppercase">
										{authMessage("หรือดำเนินการต่อด้วย")}
									</span>
								</div>
								<Button
									className="items-center justify-center"
									variant="outline"
									disabled={form.formState.isSubmitting}
									type="button"
									onClick={async () => {
										setIsGoogleLoading(true);
										await onGoogle();
									}}
								>
									{isGoogleLoading ? (
										<Loader className="animate-spin" />
									) : (
										<>
											<FaGoogle className="size-3" /> {authMessage("ดำเนินการต่อด้วย Google")}
										</>
									)}
								</Button>
								<div className="flex gap-1 justify-center items-center text-sm">
									ยังไม่มีบัญชี?{" "}
									<ExtendLink linkComponent={linkComponent} href="/auth/signup">
										{authMessage("สมัครเลย")}
									</ExtendLink>
								</div>
							</div>
							{/* <AuthLoginWithQrCode t={authMessage} /> */}
						</CardContent>
					</form>
				</Form>
			</CardTransition>
			{/* <AuthFooter /> */}
		</div>
	);
}
