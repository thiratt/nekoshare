import * as React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	type Control,
	type ControllerFieldState,
	type ControllerRenderProps,
	type FieldPath,
	type FieldValues,
	useForm,
	type UseFormProps,
	type UseFormReturn,
} from "react-hook-form";
import { z } from "zod";

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
import { cn } from "@workspace/ui/lib/utils";

type UseNFormOptions<TSchema extends z.ZodTypeAny, TContext = undefined> = Omit<
	UseFormProps<z.input<TSchema>, TContext, z.output<TSchema>>,
	"resolver"
> & {
	schema: TSchema;
};

type NFormProps<
	TFieldValues extends FieldValues,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
> = Omit<React.ComponentProps<"form">, "onSubmit"> & {
	children: React.ReactNode;
	form: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
	onSubmit: Parameters<UseFormReturn<TFieldValues, TContext, TTransformedValues>["handleSubmit"]>[0];
};

type NFieldProps<
	TFieldValues extends FieldValues,
	TName extends FieldPath<TFieldValues>,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
> = {
	controlClassName?: string;
	description?: React.ReactNode;
	descriptionClassName?: string;
	form?: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
	itemClassName?: string;
	label?: React.ReactNode;
	labelAction?: React.ReactNode;
	labelClassName?: string;
	labelRowClassName?: string;
	messageClassName?: string;
	name: TName;
	render: (props: {
		field: ControllerRenderProps<TFieldValues, TName>;
		fieldState: ControllerFieldState;
		form: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
	}) => React.ReactNode;
};

type NInputFieldProps<
	TFieldValues extends FieldValues,
	TName extends FieldPath<TFieldValues>,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
> = Omit<NFieldProps<TFieldValues, TName, TContext, TTransformedValues>, "render"> & {
	inputProps?: Omit<React.ComponentProps<typeof Input>, "name" | "onBlur" | "onChange" | "ref" | "value">;
	valueFormatter?: (value: TFieldValues[TName]) => React.ComponentProps<typeof Input>["value"];
};

type AnyNFormReturn = UseFormReturn<FieldValues, unknown, FieldValues | undefined>;

const NFormContext = React.createContext<AnyNFormReturn | null>(null);

function useNForm<TSchema extends z.ZodTypeAny, TContext = undefined>({
	schema,
	...options
}: UseNFormOptions<TSchema, TContext>) {
	return useForm<z.input<TSchema>, TContext, z.output<TSchema>>({
		...options,
		resolver: zodResolver(schema),
	});
}

function NForm<
	TFieldValues extends FieldValues,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
>({
	autoComplete = "off",
	children,
	form,
	noValidate = true,
	onSubmit,
	...props
}: NFormProps<TFieldValues, TContext, TTransformedValues>) {
	return (
		<NFormContext.Provider value={form as unknown as AnyNFormReturn}>
			<Form {...form}>
				<form autoComplete={autoComplete} noValidate={noValidate} onSubmit={form.handleSubmit(onSubmit)} {...props}>
					{children}
				</form>
			</Form>
		</NFormContext.Provider>
	);
}

function NField<
	TFieldValues extends FieldValues,
	TName extends FieldPath<TFieldValues>,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
>({
	controlClassName,
	description,
	descriptionClassName,
	form,
	itemClassName,
	label,
	labelAction,
	labelClassName,
	labelRowClassName,
	messageClassName,
	name,
	render,
}: NFieldProps<TFieldValues, TName, TContext, TTransformedValues>) {
	const resolvedForm = useResolvedNForm(form, "NField");

	return (
		<FormField
			control={resolvedForm.control as unknown as Control<TFieldValues>}
			name={name}
			render={({ field, fieldState }) => (
				<FormItem className={itemClassName}>
					{label || labelAction ? (
						<div className={cn("flex items-center justify-between gap-3", labelRowClassName)}>
							{label ? <FormLabel className={labelClassName}>{label}</FormLabel> : <span />}
							{labelAction}
						</div>
					) : null}
					<FormControl className={controlClassName}>
						{render({ field, fieldState, form: resolvedForm })}
					</FormControl>
					{description ? (
						<FormDescription className={descriptionClassName}>{description}</FormDescription>
					) : null}
					<FormMessage className={messageClassName} />
				</FormItem>
			)}
		/>
	);
}

function NInputField<
	TFieldValues extends FieldValues,
	TName extends FieldPath<TFieldValues>,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
>({ form, inputProps, valueFormatter, ...props }: NInputFieldProps<TFieldValues, TName, TContext, TTransformedValues>) {
	const resolvedForm = useResolvedNForm(form, "NInputField");
	const { disabled, ...restInputProps } = inputProps ?? {};

	return (
		<NField
			{...props}
			form={resolvedForm}
			render={({ field }) => (
				<Input
					{...restInputProps}
					{...field}
					value={
						valueFormatter ? valueFormatter(field.value as TFieldValues[TName]) : getInputValue(field.value)
					}
					disabled={disabled ?? resolvedForm.formState.isSubmitting}
				/>
			)}
		/>
	);
}

function NPasswordField<
	TFieldValues extends FieldValues,
	TName extends FieldPath<TFieldValues>,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
>(props: NInputFieldProps<TFieldValues, TName, TContext, TTransformedValues>) {
	return <NInputField {...props} inputProps={{ ...props.inputProps, type: "password" }} />;
}

function NFormActions({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="nform-actions" className={cn("flex flex-col gap-2", className)} {...props} />;
}

function useNFormContext<
	TFieldValues extends FieldValues = FieldValues,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
>() {
	const form = React.useContext(NFormContext);

	if (!form) {
		throw new Error("useNFormContext must be used within <NForm>");
	}

	return form as unknown as UseFormReturn<TFieldValues, TContext, TTransformedValues>;
}

function useResolvedNForm<
	TFieldValues extends FieldValues,
	TContext = unknown,
	TTransformedValues extends FieldValues | undefined = undefined,
>(form: UseFormReturn<TFieldValues, TContext, TTransformedValues> | undefined, componentName: string) {
	const contextForm = React.useContext(NFormContext) as UseFormReturn<TFieldValues, TContext, TTransformedValues> | null;
	const resolvedForm = form ?? contextForm;

	if (!resolvedForm) {
		throw new Error(`${componentName} must be used within <NForm> or receive a form prop`);
	}

	return resolvedForm;
}

function getInputValue(value: unknown): React.ComponentProps<typeof Input>["value"] {
	if (typeof value === "string" || typeof value === "number") {
		return value;
	}

	if (value == null) {
		return "";
	}

	return String(value);
}

export { NField, NForm, NFormActions, NInputField, NPasswordField, useNForm, useNFormContext };
