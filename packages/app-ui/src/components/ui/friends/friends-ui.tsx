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
import { FriendsCard, FriendsContent, FriendsHeader, FriendsTable, Pagination } from "./layout";

export function FriendsUI() {
	const { items, loading, error, refresh, invite, revoke, accept, deny } = useFriends();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [currentPage, setCurrentPage] = useState(1);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [revokeConfirmation, setRevokeConfirmation] = useState<{ open: boolean; ids: string[] }>({
		open: false,
		ids: [],
	});

	const [sorting, setSorting] = useState<SortingState>([]);
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const filteredItems = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();
		if (!normalizedQuery) return items;
		return items.filter((friend) => `${friend.name} ${friend.email}`.toLowerCase().includes(normalizedQuery));
	}, [items, deferredQuery]);

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
		await revoke(ids);
	}, [revokeConfirmation, revoke]);

	const handleInvite = useCallback(
		async (data: { email: string; message?: string }) => {
			await invite(data);
			setIsAddDialogOpen(false);
		},
		[invite]
	);

	const columns = useColumns({
		onAccept: accept,
		onDeny: deny,
		onRemove: (id) => handleRevokeRequest([id]),
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
		getRowId: (row) => row.id,
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
				onInvite={handleInvite}
			/>

			<FriendsContent error={error}>
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
