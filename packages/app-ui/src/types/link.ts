export type LinkComponentProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
	to: string;
	children: React.ReactNode;
	className?: string;
};

export type LinkComponent = React.ComponentType<LinkComponentProps>;

export interface AppLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string;
	children: React.ReactNode;
	className?: string;
	asButton?: boolean;
}
