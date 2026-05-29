import { RevokeConfirmDialog } from "../dialogs/RevokeConfirmDialog";
import { useFriendsController } from "../hooks/useFriendsController";
import { FriendsContent } from "./FriendsContent";
import { FriendsHeader } from "./FriendsHeader";
import { FriendsToolbar } from "./FriendsToolbar";

export function FriendsUI() {
	const controller = useFriendsController();

	return (
		<div className="flex min-h-full flex-col">
			<FriendsHeader
				addDialogOpen={controller.isAddDialogOpen}
				onAddDialogOpenChange={controller.setIsAddDialogOpen}
				onSendRequest={controller.handleSendRequest}
			/>

			<FriendsToolbar
				loading={controller.loading}
				query={controller.query}
				onClearSearch={controller.handleClearSearch}
				onRefresh={controller.handleRefresh}
				onSearchQuery={controller.setQuery}
			/>

			{controller.error ? (
				<div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{controller.error}
				</div>
			) : null}

			<div className="min-h-0 flex-1 space-y-5">
				<FriendsContent
					actionLoading={controller.actionLoading}
					filteredFriends={controller.filteredFriends}
					filteredIncoming={controller.filteredIncoming}
					filteredOutgoing={controller.filteredOutgoing}
					isEmpty={controller.isEmpty}
					loading={controller.loading}
					onAccept={controller.handleAccept}
					onAddFriend={controller.openAddDialog}
					onCancel={controller.handleCancel}
					onReject={controller.handleReject}
					onRemove={controller.handleRemove}
					query={controller.deferredQuery}
					showNoResults={controller.showNoResults}
					totalCount={controller.totalCount}
				/>
			</div>

			<RevokeConfirmDialog
				open={controller.deleteConfirmation.open}
				count={1}
				onConfirm={controller.handleConfirmDelete}
				onCancel={controller.handleCancelDelete}
			/>
		</div>
	);
}
