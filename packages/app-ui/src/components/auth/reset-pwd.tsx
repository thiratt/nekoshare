import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordFormSchema } from "@workspace/app-ui/libs/schemas";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";

import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { IncludeLinkComponentProps } from "@workspace/app-ui/types/index";
import { TResetPasswordSchema } from "@workspace/app-ui/types/schema";

import { ExtendLink } from "../link";
import { CardTransition } from "../transition-view";

interface ResetPasswordCardProps extends IncludeLinkComponentProps {
	onSubmit: (data: TResetPasswordSchema) => Promise<void>;
}

export function ResetPasswordCard({ linkComponent, onSubmit }: ResetPasswordCardProps) {
	const form = useForm<TResetPasswordSchema>({
		mode: "onChange",
		resolver: zodResolver(resetPasswordFormSchema),
		defaultValues: {
			email: "",
		},
	});

	return (
		<CardTransition tag="auth-card">
			<CardHeader>
				<CardTitle className="text-2xl font-semibold">ลืมรหัสผ่าน</CardTitle>
				<CardDescription>กรอกอีเมลด้านล่างเพื่อรับลิงก์ในการกู้คืนรหัสผผ่าน</CardDescription>
			</CardHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} autoComplete="off" className="contents">
					<CardContent>
						<div className="flex flex-col gap-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>อีเมล</FormLabel>
										<FormControl>
											<Input type="email" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex gap-2 justify-end">
								<Button variant="outline" asChild>
									<ExtendLink linkComponent={linkComponent} href="/auth/login" asButton>
										กลับ
									</ExtendLink>
								</Button>
								<Button>ยืนยัน</Button>
							</div>
						</div>
					</CardContent>
				</form>
			</Form>
		</CardTransition>
	);
}
