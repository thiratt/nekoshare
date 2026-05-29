import type { ReactNode } from "react";

import { LuLaptop, LuMonitor, LuSmartphone, LuUsers } from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Field, FieldLabel, FieldSet } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

import type { Device, Friend } from "../../drop-overlay";

type HomeTargetTrayProps = {
	devices: Device[];
	friends: Friend[];
	selectedTargetIds: string[];
	publicShare: boolean;
	onToggleTarget: (targetId: string) => void;
};

export function HomeTargetTray({
	devices,
	friends,
	onToggleTarget,
	publicShare,
	selectedTargetIds,
}: HomeTargetTrayProps) {
	const hasTargets = devices.length > 0 || friends.length > 0;

	return (
		<section className="w-full space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h2 className="font-medium text-foreground">ผู้รับ</h2>
					<p className="text-sm text-muted-foreground">
						{publicShare
							? "สร้างลิงก์เพื่อให้เข้าถึงไฟล์ที่แชร์ได้"
							: "เลือกอุปกรณ์หรือเพื่อนที่ต้องการแชร์ไฟล์ให้"}
					</p>
				</div>

				{!publicShare ? <Badge>{selectedTargetIds.length} เลือกแล้ว</Badge> : null}
			</div>

			{publicShare ? (
				<FieldSet>
					<Field>
						<FieldLabel htmlFor="public-share-password">รหัสผ่าน (ไม่จำเป็น)</FieldLabel>
						<Input id="public-share-password" type="password" autoComplete="off" placeholder="••••••••" />
					</Field>
				</FieldSet>
			) : hasTargets ? (
				<div className="grid gap-2 sm:grid-cols-2">
					<TargetGroup title="อุปกรณ์ของคุณ" emptyText="ยังไม่มีอุปกรณ์อื่น" icon={<LuMonitor />}>
						{devices.map((device) => {
							const targetId = `device:${device.id}`;

							return (
								<DeviceTargetButton
									key={targetId}
									device={device}
									selected={selectedTargetIds.includes(targetId)}
									onClick={() => onToggleTarget(targetId)}
								/>
							);
						})}
					</TargetGroup>

					<TargetGroup title="เพื่อน" emptyText="ยังไม่มีเพื่อน" icon={<LuUsers />}>
						{friends.map((friend) => {
							const targetId = `friend:${friend.id}`;

							return (
								<FriendTargetButton
									key={targetId}
									friend={friend}
									selected={selectedTargetIds.includes(targetId)}
									onClick={() => onToggleTarget(targetId)}
								/>
							);
						})}
					</TargetGroup>
				</div>
			) : (
				<div className="rounded-xl border border-dashed bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
					ยังไม่มีอุปกรณ์หรือเพื่อนให้เลือก
				</div>
			)}
		</section>
	);
}

function TargetGroup({
	children,
	emptyText,
	icon,
	title,
}: {
	children: ReactNode;
	emptyText: string;
	icon: ReactNode;
	title: string;
}) {
	const hasChildren = Boolean(children) && (Array.isArray(children) ? children.length > 0 : true);

	return (
		<div className="min-w-0 space-y-2">
			<div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
				<span className="text-sm">{icon}</span>
				{title}
			</div>

			<div className="space-y-2">
				{hasChildren ? (
					children
				) : (
					<div className="rounded-xl border border-dashed bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
						{emptyText}
					</div>
				)}
			</div>
		</div>
	);
}

function DeviceTargetButton({ device, onClick, selected }: { device: Device; onClick: () => void; selected: boolean }) {
	const Icon = device.type === "mobile" ? LuSmartphone : LuLaptop;

	return (
		<button
			type="button"
			className={cn(
				"flex w-full items-center gap-3 rounded-xl border bg-background px-3 py-2 text-left transition-colors",
				selected ? "border-primary bg-primary/10" : "hover:bg-muted/60",
			)}
			onClick={onClick}
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
				<Icon className="size-5" />
			</div>

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{device.name}</p>
				<p className="text-xs text-muted-foreground">{device.isOnline ? "ออนไลน์" : "ออฟไลน์"}</p>
			</div>

			<span
				className={cn("size-2.5 rounded-full", device.isOnline ? "bg-green-500" : "bg-muted-foreground/40")}
			/>
		</button>
	);
}

function FriendTargetButton({ friend, onClick, selected }: { friend: Friend; onClick: () => void; selected: boolean }) {
	const isOnline = friend.status === "online";

	return (
		<button
			type="button"
			className={cn(
				"flex w-full items-center gap-3 rounded-xl border bg-background px-3 py-2 text-left transition-colors",
				selected ? "border-primary bg-primary/10" : "hover:bg-muted/60",
			)}
			onClick={onClick}
		>
			<Avatar className="size-10 border">
				{friend.avatar ? <AvatarImage src={friend.avatar} /> : null}
				<AvatarFallback>{friend.name.slice(0, 1).toUpperCase()}</AvatarFallback>
			</Avatar>

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-foreground">{friend.name}</p>
				<p className="text-xs text-muted-foreground">{isOnline ? "ออนไลน์" : "ออฟไลน์"}</p>
			</div>

			<span className={cn("size-2.5 rounded-full", isOnline ? "bg-green-500" : "bg-muted-foreground/40")} />
		</button>
	);
}
