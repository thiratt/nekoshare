import * as React from "react";
import { useId, useState } from "react";

import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

function BaseInput({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
				"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
				className,
			)}
			{...props}
		/>
	);
}

function Input({
	className,
	type,
	eyeStyle,
	...props
}: React.ComponentProps<typeof BaseInput> & {
	eyeStyle?: string;
}) {
	const [isVisible, setIsVisible] = useState(false);
	const isPasswordType = type === "password";

	const id = useId();

	return (
		<div className="relative w-full">
			<BaseInput
				id={id}
				type={isPasswordType ? (isVisible ? "text" : "password") : type}
				className={cn(
					"w-full",
					isPasswordType && "pr-10 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden",
					className,
				)}
				{...props}
			/>
			{isPasswordType && (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					tabIndex={-1}
					onClick={() => setIsVisible((prevState) => !prevState)}
					className={cn(
						"text-muted-foreground focus-visible:ring-ring/50 absolute top-1/2 -translate-y-1/2 right-1 rounded-l-none hover:bg-transparent",
						eyeStyle,
					)}
				>
					{isVisible ? <EyeOffIcon /> : <EyeIcon />}
					<span className="sr-only">{isVisible ? "Hide password" : "Show password"}</span>
				</Button>
			)}
		</div>
	);
}

export { Input };
