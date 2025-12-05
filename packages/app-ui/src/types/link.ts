export type LinkComponentProps = {
	to: string;
	children: React.ReactNode;
	className?: string;
};

export type LinkComponent = React.ComponentType<LinkComponentProps>;

export interface IncludeLinkComponentProps {
	linkComponent: LinkComponent;
}

export interface ExtendLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string;
	children: React.ReactNode;
	className?: string;
	linkComponent: LinkComponent;
	enableTransition?: boolean;
	asButton?: boolean;
}
