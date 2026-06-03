import {
	Children,
	cloneElement,
	type ComponentProps,
	createContext,
	type ElementType,
	isValidElement,
	type MouseEvent,
	type MouseEventHandler,
	type ReactElement,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

type DetailPanelContextValue = {
	open: boolean;
	setOpen: (open: boolean) => void;
	width: number;
	gap: number;
};

type DetailPanelProviderProps = ComponentProps<"div"> & {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	width?: number;
	gap?: number;
};

type DetailPanelProps = ComponentProps<"div"> & {
	as?: ElementType;
};

type DetailPanelTriggerProps = ComponentProps<"button"> & {
	asChild?: boolean;
};

type DetailPanelContentProps = ComponentProps<"aside"> & {
	shellClassName?: string;
	motionClassName?: string;
};

type DetailPanelTriggerChildProps = ComponentProps<"button"> & {
	"data-state"?: "open" | "closed";
	onClick?: MouseEventHandler<HTMLElement>;
};

const DetailPanelContext = createContext<DetailPanelContextValue | null>(null);

export function DetailPanelProvider({
	open,
	defaultOpen = false,
	onOpenChange,
	width = 300,
	gap = 8,
	className,
	children,
	...props
}: DetailPanelProviderProps) {
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const isControlled = open !== undefined;
	const currentOpen = isControlled ? open : uncontrolledOpen;

	const setOpen = useCallback(
		(nextOpen: boolean) => {
			if (!isControlled) {
				setUncontrolledOpen(nextOpen);
			}
			onOpenChange?.(nextOpen);
		},
		[isControlled, onOpenChange],
	);

	const contextValue = useMemo(
		() => ({
			open: currentOpen,
			setOpen,
			width,
			gap,
		}),
		[currentOpen, setOpen, width, gap],
	);

	return (
		<DetailPanelContext.Provider value={contextValue}>
			<div className={cn("flex min-h-0 flex-1 overflow-hidden", className)} {...props}>
				{children}
			</div>
		</DetailPanelContext.Provider>
	);
}

export function DetailPanel({ as: Comp = "div", className, ...props }: DetailPanelProps) {
	return <Comp className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)} {...props} />;
}

export function DetailPanelTrigger({ asChild = false, onClick, children, ...props }: DetailPanelTriggerProps) {
	const { open, setOpen } = useDetailPanel();
	const handleClick: MouseEventHandler<HTMLElement> = (event) => {
		onClick?.(event as MouseEvent<HTMLButtonElement>);
		if (!event.defaultPrevented) {
			setOpen(!open);
		}
	};

	if (asChild) {
		const child = Children.only(children);

		if (!isValidElement<DetailPanelTriggerChildProps>(child)) {
			return null;
		}

		return cloneElement(child as ReactElement<DetailPanelTriggerChildProps>, {
			"aria-expanded": open,
			"data-state": open ? "open" : "closed",
			onClick: (event) => {
				child.props.onClick?.(event);
				handleClick(event);
			},
			...props,
		});
	}

	return (
		<button
			type="button"
			aria-expanded={open}
			data-state={open ? "open" : "closed"}
			onClick={handleClick}
			{...props}
		>
			{children}
		</button>
	);
}

export function DetailPanelContent({
	className,
	shellClassName,
	motionClassName,
	children,
	style,
	...props
}: DetailPanelContentProps) {
	const { open, width, gap } = useDetailPanel();

	return (
		<AnimatePresence initial={false}>
			{open ? (
				<motion.div
					key="detail-panel-shell"
					initial={{ width: 0, marginLeft: 0, opacity: 0 }}
					animate={{ width, marginLeft: gap, opacity: 1 }}
					exit={{ width: 0, marginLeft: 0, opacity: 0 }}
					transition={{
						width: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
						marginLeft: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
						opacity: { duration: 0.12 },
					}}
					className={cn("box-border h-full min-h-0 shrink-0 overflow-hidden", shellClassName)}
				>
					<aside
						className={cn("h-full overflow-hidden", motionClassName, className)}
						style={{ width, ...style }}
						{...props}
					>
						{children}
					</aside>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

export function DetailPanelHeader() {
	const { setOpen } = useDetailPanel();

	const handleClose = () => setOpen(false);

	return (
		<div className="flex items-center justify-between border-b px-4 py-3">
			<h2 className="text-sm font-medium text-foreground">รายละเอียด</h2>

			<Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" onClick={handleClose}>
				<LuX />
			</Button>
		</div>
	);
}

function useDetailPanel() {
	const context = useContext(DetailPanelContext);

	if (!context) {
		throw new Error("DetailPanel components must be used inside DetailPanelProvider.");
	}

	return context;
}
