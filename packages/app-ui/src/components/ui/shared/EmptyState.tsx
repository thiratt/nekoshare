import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@workspace/ui/components/empty";

export type EmptyStateProps = {
	icon?: React.ReactNode;
	title: string;
	description: string;
	action?: React.ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<Empty className="h-full">
			<EmptyHeader>
				{icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
			{action && <EmptyContent>{action}</EmptyContent>}
		</Empty>
	);
}
