import { memo } from "react";

import { AnimatePresence, motion } from "motion/react";

import { fadeScaleVariants, fadeVariants } from "../../provide-animate";
import { ConfigPanel, DropColumn, DropZone, FileList, Header } from "./components";
import { TRANSITION_SPRING_SOFT } from "./constants";
import { useDropOverlay } from "./context";
import type { Device, Friend } from "./types";

interface ContentAreaProps {
	isExpanded: boolean;
	isOptionsHovered: boolean;
	devices: Device[];
	friends: Friend[];
}

interface DropOverlayUIProps {
	devices: Device[];
	friends: Friend[];
}

interface DropOverlayUISimpleProps {
	devices?: Device[];
	friends?: Friend[];
}

const DEFAULT_DEVICES: Device[] = [
	{ id: "d1", name: "iPhone 15 Pro", type: "mobile", isOnline: true },
	{ id: "d2", name: "MacBook Air", type: "desktop", isOnline: true },
];

const DEFAULT_FRIENDS: Friend[] = [
	{ id: "f1", name: "Alice", status: "online" },
	{ id: "f2", name: "Bob", status: "offline" },
	{ id: "f3", name: "Charlie", status: "online" },
	{ id: "f4", name: "David", status: "offline" },
];

const HeaderWrapper = memo(function HeaderWrapper() {
	const { state, actions, computed } = useDropOverlay();
	const { isExpanded, fileEntries } = state;
	const { setIsExpanded, close } = actions;
	const { fileCount, hasFiles, pendingCount, uploadingCount, completedCount } = computed;

	return (
		<Header
			isExpanded={isExpanded}
			hasFiles={hasFiles}
			fileCount={fileCount}
			pendingCount={pendingCount}
			uploadingCount={uploadingCount}
			completedCount={completedCount}
			fileEntries={fileEntries}
			onCollapse={() => setIsExpanded(false)}
			onExpand={() => setIsExpanded(true)}
			onClose={close}
		/>
	);
});

const ContentArea = memo(function ContentArea({ isExpanded, isOptionsHovered, devices, friends }: ContentAreaProps) {
	const { state, actions, computed } = useDropOverlay();
	const { fileEntries, selectedTargets, globalOptions, activeDropId, isDragging } = state;
	const { removeFile, toggleTarget, toggleOption, setOptionValue, sendFiles, clearCompleted, setIsExpanded } =
		actions;
	const { hasFiles, completedCount } = computed;

	const optionsColumnFlex = isOptionsHovered ? 2.5 : 1;

	return (
		<motion.div variants={fadeScaleVariants} initial="hidden" animate="visible" className="flex-1">
			<AnimatePresence mode="wait" initial={false}>
				{isExpanded ? (
					<motion.div
						key="expanded"
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 20 }}
						transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
						className="relative flex gap-4"
					>
						<FileList
							files={fileEntries}
							isDragging={isDragging}
							isDropActive={isOptionsHovered}
							onRemove={removeFile}
							onClearCompleted={clearCompleted}
							completedCount={completedCount}
						/>

						<ConfigPanel
							files={fileEntries}
							devices={devices}
							friends={friends}
							selectedTargets={selectedTargets}
							globalOptions={globalOptions}
							onToggleTarget={toggleTarget}
							onToggleOption={toggleOption}
							onSetOptionValue={setOptionValue}
							onSend={sendFiles}
						/>
					</motion.div>
				) : (
					<motion.div
						key="grid"
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -20 }}
						transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
						className="flex h-full gap-4"
					>
						<DropColumn title="Your Devices">
							{devices.map((device) => (
								<DropZone
									key={device.id}
									variant="device"
									dropId={`device-${device.id}`}
									dropType="device"
									isActive={activeDropId === `device-${device.id}`}
									data={device}
								/>
							))}
						</DropColumn>

						<DropColumn title="Friends">
							{friends.map((friend) => (
								<DropZone
									key={friend.id}
									variant="friend"
									dropId={`friend-${friend.id}`}
									dropType="friend"
									isActive={activeDropId === `friend-${friend.id}`}
									data={friend}
								/>
							))}
						</DropColumn>

						<motion.div
							layout="position"
							className="flex flex-1 flex-col gap-3 min-w-0"
							animate={{ flex: optionsColumnFlex }}
							transition={TRANSITION_SPRING_SOFT}
						>
							<h3 className="px-1 text-xs font-medium uppercase tracking-wider text-muted dark:text-muted-foreground">
								Advanced Options
							</h3>
							<DropZone
								variant="options"
								dropId="options"
								dropType="options"
								isActive={isOptionsHovered}
								isDragging={isDragging}
								hasFiles={hasFiles}
								onExpand={() => setIsExpanded(true)}
								className="h-full"
							/>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
});

export const DropOverlayUI = memo(function DropOverlayUI({ devices, friends }: DropOverlayUIProps) {
	const { computed, containerRef, state } = useDropOverlay();
	const { showOverlay, isOptionsHovered } = computed;
	const { isExpanded } = state;

	return (
		<AnimatePresence mode="wait">
			{showOverlay && (
				<motion.div
					initial="hidden"
					animate="visible"
					exit="exit"
					variants={fadeVariants}
					className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-md dark:bg-black/70"
				>
					<div ref={containerRef} className="flex h-full flex-col gap-4 m-12 overflow-hidden">
						<HeaderWrapper />
						<ContentArea
							isExpanded={isExpanded}
							isOptionsHovered={isOptionsHovered}
							devices={devices}
							friends={friends}
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
});

export const DropOverlayUIWithDefaults = memo(function DropOverlayUIWithDefaults({
	devices = DEFAULT_DEVICES,
	friends = DEFAULT_FRIENDS,
}: DropOverlayUISimpleProps) {
	return <DropOverlayUI devices={devices} friends={friends} />;
});
