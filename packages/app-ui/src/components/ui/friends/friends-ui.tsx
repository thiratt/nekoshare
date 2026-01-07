import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

import {
	getCoreRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";

import { useFriends } from "@workspace/app-ui/hooks/use-friends";

import { useColumns } from "./columns";
import { PAGE_SIZE } from "./constants";
import { RevokeConfirmDialog } from "./dialogs";
import { FriendsCard, FriendsContent, FriendsHeader, FriendsTable, Pagination, RequestsSection } from "./layout";

export function FriendsUI() {
	const {
		friends,
		incoming,
		outgoing,
		loading,
		error,
		refresh,
		sendRequest,
		acceptRequest,
		rejectRequest,
		cancelRequest,
		removeFriend,
	} = useFriends();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [currentPage, setCurrentPage] = useState(1);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [revokeConfirmation, setRevokeConfirmation] = useState<{ open: boolean; ids: string[] }>({
		open: false,
		ids: [],
	});
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const filteredItems = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();
		if (!normalizedQuery) return friends;
		return friends.filter((friend) => `${friend.name} ${friend.email}`.toLowerCase().includes(normalizedQuery));
	}, [friends, deferredQuery]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

	const paginatedItems = useMemo(() => {
		const startIndex = (currentPage - 1) * PAGE_SIZE;
		return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
	}, [filteredItems, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [deferredQuery]);

	const handleRevokeRequest = useCallback((ids: string[]) => {
		setRevokeConfirmation({ open: true, ids });
	}, []);

	const handleRevokeConfirm = useCallback(async () => {
		const { ids } = revokeConfirmation;
		setRevokeConfirmation({ open: false, ids: [] });
		setRowSelection({});

		for (const id of ids) {
			try {
				await removeFriend(id);
			} catch (err) {
				console.error("Failed to remove friend:", err);
			}
		}
	}, [revokeConfirmation, removeFriend]);

	const handleSendRequest = useCallback(
		async (userId: string) => {
			await sendRequest(userId);
			setIsAddDialogOpen(false);
		},
		[sendRequest]
	);

	const handleAccept = useCallback(
		async (friendshipId: string) => {
			setActionLoading(friendshipId);
			try {
				await acceptRequest(friendshipId);
			} finally {
				setActionLoading(null);
			}
		},
		[acceptRequest]
	);

	const handleReject = useCallback(
		async (friendshipId: string) => {
			setActionLoading(friendshipId);
			try {
				await rejectRequest(friendshipId);
			} finally {
				setActionLoading(null);
			}
		},
		[rejectRequest]
	);

	const handleCancel = useCallback(
		async (friendshipId: string) => {
			setActionLoading(friendshipId);
			try {
				await cancelRequest(friendshipId);
			} finally {
				setActionLoading(null);
			}
		},
		[cancelRequest]
	);

	const handleRemove = useCallback(
		(friendshipId: string) => {
			handleRevokeRequest([friendshipId]);
		},
		[handleRevokeRequest]
	);

	const columns = useColumns({
		onRemove: handleRemove,
	});

	const table = useReactTable({
		data: paginatedItems,
		columns,
		state: { sorting, rowSelection },
		onSortingChange: setSorting,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableRowSelection: true,
		getRowId: (row) => row.friendshipId,
	});

	const selectedIds = useMemo(() => {
		return Object.keys(rowSelection).filter((id) => rowSelection[id]);
	}, [rowSelection]);

	return (
		<FriendsCard>
			<FriendsHeader
				loading={loading}
				query={query}
				selectedCount={selectedIds.length}
				isAddDialogOpen={isAddDialogOpen}
				onRefresh={refresh}
				onQueryChange={setQuery}
				onClearQuery={() => setQuery("")}
				onRevokeSelected={() => handleRevokeRequest(selectedIds)}
				onAddDialogChange={setIsAddDialogOpen}
				onSendRequest={handleSendRequest}
			/>

			<FriendsContent error={error}>
				{incoming.length > 0 && (
					<RequestsSection
						title="คำขอเป็นเพื่อน"
						subtitle={`${incoming.length} คำขอที่รอการตอบรับ`}
						items={incoming}
						onAccept={handleAccept}
						onReject={handleReject}
						actionLoading={actionLoading}
					/>
				)}

				{outgoing.length > 0 && (
					<RequestsSection
						title="คำขอที่รอการตอบรับ"
						subtitle={`${outgoing.length} คำขอที่ส่งไปแล้ว`}
						items={outgoing}
						onCancel={handleCancel}
						actionLoading={actionLoading}
					/>
				)}

				<FriendsTable
					table={table}
					loading={loading}
					columnsLength={columns.length}
					searchQuery={deferredQuery}
				/>

				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					totalItems={filteredItems.length}
					pageItems={paginatedItems.length}
					onPageChange={setCurrentPage}
				/>
			</FriendsContent>

			<RevokeConfirmDialog
				open={revokeConfirmation.open}
				count={revokeConfirmation.ids.length}
				onConfirm={handleRevokeConfirm}
				onCancel={() => setRevokeConfirmation({ open: false, ids: [] })}
			/>
		</FriendsCard>
	);
}
