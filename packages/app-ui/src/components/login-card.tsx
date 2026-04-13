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

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { ExtendLink } from "@workspace/app-ui/components/ext/link";
import { createLoginFormSchema } from "@workspace/app-ui/schemas/auth";
import type { IncludeLinkComponentProps } from "@workspace/app-ui/types/link";
import type { TLoginSchema } from "@workspace/app-ui/types/schema";

import { useAppI18n } from "@workspace/i18n/react";

interface ExampleDataLoginProps {
	identifier: string;
	password: string;
}

interface LoginCardProps extends IncludeLinkComponentProps {
	data?: ExampleDataLoginProps;
	onGoogle: () => Promise<void>;
	onSubmit: (data: TLoginSchema) => Promise<void>;
	socialErrorMessage?: string | null;
}

export function LoginCard({
	data,
	linkComponent,
	onGoogle,
	onSubmit,
	socialErrorMessage,
}: LoginCardProps): JSX.Element {
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const { t } = useAppI18n();
	const form = useForm<TLoginSchema>({
		mode: "onSubmit",
		resolver: zodResolver(createLoginFormSchema(t)),
		defaultValues: {
			identifier: data ? data.identifier : "",
			password: data ? data.password : "",
		},
	});

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
									href="/reset-pwd"
									tabIndex={-1}
								>
									{t("auth.login.forgotPassword")}
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
		[form.control, form.formState.isSubmitting, linkComponent, t],
	);

	return (
		<div className="space-y-4 w-full max-w-sm md:max-w-4xl">
			<CardTransition className="shadow-xl" tag="auth-card">
				<CardHeader>
					<CardTitle className="text-2xl font-semibold">{t("auth.login.title")}</CardTitle>
					<CardDescription>{t("auth.login.description")}</CardDescription>
				</CardHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="contents">
						<CardContent className="space-y-4">
							<div className="flex flex-col gap-4">
								{socialErrorMessage ? (
									<Alert variant="destructive">
										<AlertTitle>{socialErrorMessage}</AlertTitle>
									</Alert>
								) : null}
								{renderField("identifier", t("auth.login.identifier"))}
								{renderField("password", t("auth.login.password"), "password")}

								<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
									{!form.formState.isSubmitting ? t("auth.login.submit") : <LuLoader className="animate-spin" />}
								</Button>
								<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
									<span className="relative z-10 bg-card px-2 text-muted-foreground uppercase">
										{t("auth.login.divider")}
									</span>
								</div>
								<Button
									className="items-center justify-center"
									variant="outline"
									disabled={form.formState.isSubmitting}
									type="button"
									onClick={async () => {
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
											<FaGoogle className="size-3" /> {t("auth.login.google")}
										</>
									)}
								</Button>
								<div className="flex gap-1 justify-center items-center text-sm">
									{t("auth.login.signUpPrompt")}{" "}
									<ExtendLink linkComponent={linkComponent} href="/signup">
										{t("auth.login.signUpCta")}
									</ExtendLink>
								</div>
							</div>
						</CardContent>
					</form>
				</Form>
			</CardTransition>
		</div>
	);
}
