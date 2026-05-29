import { LuUserPlus } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogTrigger } from "@workspace/ui/components/dialog";

import { AddFriendDialog } from "../dialogs/AddFriendDialog";

type FriendsHeaderProps = {
	addDialogOpen: boolean;
	onAddDialogOpenChange: (open: boolean) => void;
	onSendRequest: (userId: string) => Promise<void>;
};

export function FriendsHeader({ addDialogOpen, onAddDialogOpenChange, onSendRequest }: FriendsHeaderProps) {
	return (
		<header className="mb-4 flex items-start justify-between gap-4">
			<div>
				<h1 className="text-xl font-semibold tracking-tight text-foreground">เพื่อน</h1>
				<p className="text-sm text-muted-foreground">คนที่คุณอนุญาตให้แชร์ไฟล์ด้วยได้โดยตรง</p>
			</div>

			<Dialog open={addDialogOpen} onOpenChange={onAddDialogOpenChange}>
				<DialogTrigger asChild>
					<Button type="button" size="sm" className="rounded-full">
						<LuUserPlus />
						เพิ่มเพื่อน
					</Button>
				</DialogTrigger>
				<AddFriendDialog onSubmit={onSendRequest} />
			</Dialog>
		</header>
	);
}
