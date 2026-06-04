import { type JSX, useCallback, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { FaGoogle } from "react-icons/fa";
import { LuLoader } from "react-icons/lu";

import { Alert, AlertTitle } from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";

import { createSignupFormSchema } from "@workspace/app-ui/schemas/auth";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";

import { AppLink } from "./app-link";
import { CardTransition } from "./ext/card-transition";

import { useAppI18n } from "@workspace/i18n/react";

interface ExampleDataSignupProps {
	username: string;
	email: string;
	password: string;
}

interface SignupCardProps {
	data?: ExampleDataSignupProps;
	onGoogle?: () => Promise<void>;
	onSubmit: (data: TSignupSchema) => Promise<void>;
	socialErrorMessage?: string | null;
}

export function SignupCard({
	data,
	onGoogle,
	onSubmit,
	socialErrorMessage,
}: SignupCardProps): JSX.Element {
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const { t } = useAppI18n();
	const form = useForm<TSignupSchema>({
		mode: "onSubmit",
		resolver: zodResolver(createSignupFormSchema(t)),
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
		[form.control],
	);

	return (
		<div className="space-y-4 w-full max-w-sm md:max-w-4xl">
			<CardTransition className="shadow-xl" tag="auth-card">
				<CardHeader>
					<CardTitle className="text-2xl font-semibold">{t("auth.signup.title")}</CardTitle>
					<CardDescription>{t("auth.signup.description")}</CardDescription>
				</CardHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off">
						<CardContent className="space-y-4">
							<div className="flex flex-col gap-4">
								{socialErrorMessage ? (
									<Alert variant="destructive">
										<AlertTitle>{socialErrorMessage}</AlertTitle>
									</Alert>
								) : null}
								{renderField("username", t("auth.signup.username"), "name")}
								{renderField("email", t("auth.signup.email"), "email")}
								<div className="grid grid-cols-2 gap-4">
									{renderField("password", t("auth.signup.password"), "password")}
									{renderField("confirmPassword", t("auth.signup.confirmPassword"), "password")}
								</div>

								<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
									{t("common.actions.continue")}
								</Button>
								<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
									<span className="relative z-10 bg-card px-2 text-muted-foreground uppercase">
										{t("auth.signup.divider")}
									</span>
								</div>
								<Button
									className="items-center justify-center"
									variant="outline"
									type="button"
									disabled={form.formState.isSubmitting || !onGoogle}
									onClick={async () => {
										if (!onGoogle) {
											return;
										}

										setIsGoogleLoading(true);
										try {
											await onGoogle();
										} finally {
											setIsGoogleLoading(false);
										}
									}}
								>
									{isGoogleLoading ? (
										<LuLoader className="animate-spin" />
									) : (
										<>
											<FaGoogle className="size-3" /> {t("auth.signup.google")}
										</>
									)}
								</Button>
								<div className="flex gap-1 justify-center items-center text-sm">
									{t("auth.signup.loginPrompt")}
									<AppLink href="/login">
										{t("auth.signup.loginCta")}
									</AppLink>
								</div>
							</div>
						</CardContent>
					</form>
				</Form>
			</CardTransition>
		</div>
	);
}
