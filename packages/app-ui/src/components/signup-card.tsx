import { useCallback } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";

import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Form,FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";

import { signupFormSchema } from "@workspace/app-ui/schemas/auth";
import { TSignupSchema } from "@workspace/app-ui/types/schema";
import type { IncludeLinkComponentProps } from "@workspace/app-ui/types/link";

import { CardTransition } from "./ext/card-transition";
import { ExtendLink } from "./ext/link";

interface ExampleDataSignupProps {
	username: string;
	email: string;
	password: string;
}

interface SignupCardProps extends IncludeLinkComponentProps {
	data?: ExampleDataSignupProps;
	onSubmit: (data: TSignupSchema) => Promise<void>;
}

export function SignupCard({ data, linkComponent, onSubmit }: SignupCardProps) {
	const form = useForm<TSignupSchema>({
		mode: "onSubmit",
		resolver: zodResolver(signupFormSchema),
		defaultValues: {
			username: data ? data.username : "",
			email: data ? data.email : "",
			password: data ? data.password : "",
			confirmPassword: data ? data.password : "",
		},
	});

	const renderField = useCallback(
		(name: keyof TSignupSchema, label: string, type: string = "text") => (
			<FormField
				control={form.control}
				name={name}
				render={({ field }) => (
					<FormItem>
						<FormLabel className="flex justify-between">{label}</FormLabel>
						<FormControl>
							<Input type={type} {...field} value={typeof field.value === "string" ? field.value : ""} />
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
					<CardTitle className="text-2xl font-semibold">สร้างบัญชี</CardTitle>
					<CardDescription>กรอกรายละเอียดข้างล่างเพื่อสร้างบัญชี</CardDescription>
				</CardHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
						<CardContent className="space-y-4">
							<div className="flex flex-col gap-4">
								{renderField("username", "ชื่อผู้ใช้งาน", "name")}
								{renderField("email", "อีเมล", "email")}
								<div className="grid grid-cols-2 gap-4">
									{renderField("password", "รหัสผ่าน", "password")}
									{renderField("confirmPassword", "ยืนยันรหัสผ่าน", "password")}
								</div>

								<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
									ถัดไป
								</Button>
								<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
									<span className="relative z-10 bg-card px-2 text-muted-foreground uppercase">
										หรือดำเนินการต่อด้วย
									</span>
								</div>
								<Button
									className="items-center justify-center"
									variant="outline"
									disabled={form.formState.isSubmitting}
								>
									<FaGoogle className="size-3" /> ดำเนินการต่อด้วย Google
								</Button>
								<div className="flex gap-1 justify-center items-center text-sm">
									มีบัญชีอยู่แล้ว?
									<ExtendLink linkComponent={linkComponent} href="/login">
										เข้าสู่ระบบ
									</ExtendLink>
								</div>
							</div>
						</CardContent>
					</form>
				</Form>
			</CardTransition>
			{/* <div className="flex gap-1 text-xs text-muted-foreground">
				<p>By clicking continue, you agree to our</p>
				<ExtendLink linkComponent={linkComponent} href="/">
					Terms of Service
				</ExtendLink>
				<p>and</p>
				<ExtendLink linkComponent={linkComponent} href="/">
					Privacy Policy.
				</ExtendLink>
			</div> */}
		</div>
	);
}
