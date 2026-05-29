import { DeleteDeviceDialog } from "../dialogs/DeleteDeviceDialog";
import { ManageDeviceDialog } from "../dialogs/ManageDeviceDialog";
import { useDevicesController } from "../hooks/useDevicesController";
import { DevicesContent } from "./DevicesContent";
import { DevicesHeader } from "./DevicesHeader";
import { DevicesToolbar } from "./DevicesToolbar";

export function DevicesUI() {
	const controller = useDevicesController();

	return (
		<div className="flex min-h-full flex-col">
			<DevicesHeader />

			<DevicesToolbar
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
				<DevicesContent
					actionLoading={controller.actionLoading}
					currentDevices={controller.currentDevices}
					devicesCount={controller.devices.length}
					loading={controller.loading}
					onDelete={controller.handleDelete}
					onManage={controller.handleManage}
					otherDevices={controller.otherDevices}
					showEmpty={controller.showEmpty}
					showNoResults={controller.showNoResults}
				/>
			</div>

			<ManageDeviceDialog
				open={controller.isManageDialogOpen}
				onOpenChange={controller.setIsManageDialogOpen}
				device={controller.selectedDevice}
				onSave={controller.handleSaveDevice}
			/>

			<DeleteDeviceDialog
				open={controller.isDeleteDialogOpen}
				onOpenChange={controller.setIsDeleteDialogOpen}
				onConfirm={controller.handleConfirmDelete}
			/>
		</div>
	);
}
