export type LinkComponentProps = {
	to: string;
	children: React.ReactNode;
	className?: string;
};

export type LinkComponent = React.ComponentType<LinkComponentProps>;

export interface IncludeLinkComponentProps {
	linkComponent: LinkComponent;
}