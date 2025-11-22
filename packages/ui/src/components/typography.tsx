import { cn } from "@workspace/ui/lib/utils";

export interface TypographyProps {
	children: React.ReactNode;
	className?: string;
}

export interface TextListProps {
	items: string[];
}

export interface TextTableProps {
	headers: string[];
	rows: (string | number | React.ReactNode)[][];
}

export function TextH1({ children, className }: TypographyProps) {
	return (
		<h1 className={cn("scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance", className)}>
			{children}
		</h1>
	);
}

export function TextH2({ children, className }: TypographyProps) {
	return (
		<h2 className={cn("scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0", className)}>
			{children}
		</h2>
	);
}

export function TextH3({ children, className }: TypographyProps) {
	return <h3 className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}>{children}</h3>;
}

export function TextH4({ children, className }: TypographyProps) {
	return <h4 className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}>{children}</h4>;
}

export function TextP({ children, className }: TypographyProps) {
	return <p className={cn("leading-7 not-first:mt-6", className)}>{children}</p>;
}

export function TextBlockquote({ children, className }: TypographyProps) {
	return <blockquote className={cn("mt-6 border-l-2 pl-6 italic", className)}>{children}</blockquote>;
}

export function TextTable({ headers, rows }: TextTableProps) {
	return (
		<div className="my-6 w-full overflow-y-auto">
			<table className="w-full">
				<thead>
					<tr className="even:bg-muted m-0 border-t p-0">
						{headers.map((header, index) => (
							<th
								key={index}
								className="border px-4 py-2 text-left font-bold [[align=center]]:text-center [[align=right]]:text-right"
							>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, rowIndex) => (
						<tr key={rowIndex} className="even:bg-muted m-0 border-t p-0">
							{row.map((cell, cellIndex) => (
								<td
									key={cellIndex}
									className="border px-4 py-2 text-left [[align=center]]:text-center [[align=right]]:text-right"
								>
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function TextList({ items }: TextListProps) {
	return (
		<ul className="my-6 ml-6 list-disc [&>li]:mt-2">
			{items.map((item, index) => (
				<li key={index}>{item}</li>
			))}
		</ul>
	);
}

export function TextInlineCode({ children, className }: TypographyProps) {
	return (
		<code
			className={cn(
				"bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
				className
			)}
		>
			{children}
		</code>
	);
}

export function TextLead({ children, className }: TypographyProps) {
	return <p className={cn("text-muted-foreground text-xl", className)}>{children} </p>;
}

export function TextLarge({ children, className }: TypographyProps) {
	return <div className={cn("text-lg font-semibold", className)}>{children}</div>;
}

export function TextSmall({ children, className }: TypographyProps) {
	return <small className={cn("text-sm leading-none font-medium", className)}>{children}</small>;
}

export function TextMuted({ children, className }: TypographyProps) {
	return <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>;
}
