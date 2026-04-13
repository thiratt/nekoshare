import { useCallback } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LuLoader } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { ExtendLink } from "@workspace/app-ui/components/ext/link";
import { createResetPasswordFormSchema } from "@workspace/app-ui/schemas/auth";
import type { IncludeLinkComponentProps } from "@workspace/app-ui/types/link";
import type { TResetPasswordSchema } from "@workspace/app-ui/types/schema";

import { useAppI18n } from "@workspace/i18n/react";

interface ResetPasswordCardProps extends IncludeLinkComponentProps {
	data?: {
		email: string;
	};
	onSubmit: (data: TResetPasswordSchema) => Promise<void>;
}

export function ResetPasswordCard({ data, linkComponent, onSubmit }: ResetPasswordCardProps) {
	const { t } = useAppI18n();
	const form = useForm<TResetPasswordSchema>({
		mode: "onSubmit",
		resolver: zodResolver(createResetPasswordFormSchema(t)),
		defaultValues: {
			email: data?.email ?? "",
		},
	});

	const renderField = useCallback(
		(name: keyof TResetPasswordSchema, label: string, type: string = "text") => (
			<FormField
				control={form.control}
				name={name}
				render={({ field }) => (
					<FormItem>
						<FormLabel>{label}</FormLabel>
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
		[form.control, form.formState.isSubmitting],
	);

	return (
		<div className="space-y-4 w-full max-w-sm md:max-w-4xl">
			<CardTransition className="shadow-xl" tag="auth-card">
				<CardHeader>
					<CardTitle className="text-2xl font-semibold">{t("auth.resetPassword.title")}</CardTitle>
					<CardDescription>{t("auth.resetPassword.description")}</CardDescription>
				</CardHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="contents">
						<CardContent className="space-y-4">
							<div className="flex flex-col gap-4">
								{renderField("email", t("auth.resetPassword.email"), "email")}

								<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
									{form.formState.isSubmitting ? <LuLoader className="animate-spin" /> : t("common.actions.continue")}
								</Button>

								<div className="flex gap-1 justify-center items-center text-sm">
									{t("auth.resetPassword.loginPrompt")}
									<ExtendLink linkComponent={linkComponent} href="/login">
										{t("auth.resetPassword.loginCta")}
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
