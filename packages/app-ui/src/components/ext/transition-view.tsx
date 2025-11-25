import { Card } from "@workspace/ui/components/card";

interface TransitionCardProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	tag: string;
}

function mergeStyle(style: React.CSSProperties | undefined, tag: string): React.CSSProperties {
	return { ...style, viewTransitionName: tag };
}

export function NormalTransition({ children, tag, style, ...props }: TransitionCardProps) {
	return (
		<div style={mergeStyle(style, tag)} {...props}>
			{children}
		</div>
	);
}

export function CardTransition({ children, tag, style, ...props }: TransitionCardProps) {
	return (
		<Card style={mergeStyle(style, tag)} {...props}>
			{children}
		</Card>
	);
}
