import * as React from "react";
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Search, Users, UserCheck, UserX, CheckSquare, Square, Globe, Lock } from "lucide-react";
import type { Participant } from "@workspace/app-ui/types";

export function ManageParticipantsDialog({
	all,
	value,
	onChange,
	onClose,
}: {
	all: Participant[];
	value: Participant[];
	onChange: (next: Participant[]) => void;
	onClose: () => void;
}) {
	const [searchTerm, setSearchTerm] = React.useState("");
	const [isPublic, setIsPublic] = React.useState(value === null);

	const picked = React.useMemo(() => new Set(value?.map((v) => v.id) || []), [value]);

	// Filter participants based on search term
	const filteredParticipants = React.useMemo(() => {
		if (!searchTerm.trim()) return all;
		const search = searchTerm.toLowerCase();
		return all.filter((p) => p.name.toLowerCase().includes(search) || p.kind.toLowerCase().includes(search));
	}, [all, searchTerm]);

	// Group participants by kind for better organization
	const groupedParticipants = React.useMemo(() => {
		const groups: Record<string, Participant[]> = {};
		filteredParticipants.forEach((p) => {
			if (!groups[p.kind]) {
				groups[p.kind] = [];
			}
			(groups[p.kind] ?? []).push(p);
		});
		return groups;
	}, [filteredParticipants]);

	const toggle = React.useCallback(
		(id: string) => {
			const n = new Set(picked);
			n.has(id) ? n.delete(id) : n.add(id);
			onChange(all.filter((p) => n.has(p.id)));
			setIsPublic(false); // Switching to private when selecting participants
		},
		[picked, all, onChange]
	);

	const handleSelectAll = React.useCallback(() => {
		const allIds = new Set(filteredParticipants.map((p) => p.id));
		const isAllSelected = filteredParticipants.every((p) => picked.has(p.id));

		if (isAllSelected) {
			// Deselect all filtered participants
			const newPicked = new Set([...picked].filter((id) => !allIds.has(id)));
			onChange(all.filter((p) => newPicked.has(p.id)));
		} else {
			// Select all filtered participants
			const newPicked = new Set([...picked, ...allIds]);
			onChange(all.filter((p) => newPicked.has(p.id)));
		}
		setIsPublic(false);
	}, [filteredParticipants, picked, all, onChange]);

	const handlePublicToggle = React.useCallback(() => {
		setIsPublic(!isPublic);
		if (!isPublic) {
			// Making public - clear all participants
			onChange(null as any); // This represents public access
		} else {
			// Making private - restore empty selection
			onChange([]);
		}
	}, [isPublic, onChange]);

	const selectedCount = picked.size;
	const isAllSelected = filteredParticipants.length > 0 && filteredParticipants.every((p) => picked.has(p.id));
	const isSomeSelected = filteredParticipants.some((p) => picked.has(p.id)) && !isAllSelected;

	return (
		<DialogContent className="sm:max-w-[600px] max-h-[80vh]">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-2">
					<Users className="w-5 h-5" />
					จัดการสิทธิ์
				</DialogTitle>
				<DialogDescription>
					จัดการสิทธิ์ผู้ที่สามารถเข้าถึงเนื้อหานี้ได้ คุณสามารถทำให้เป็นสาธารณะได้หรือจำกัดผู้เข้าร่วมเฉพาะ
				</DialogDescription>
			</DialogHeader>

			<div className="space-y-4">
				{isPublic && (
					<div className="ml-6 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border">
						<p className="text-sm text-blue-700 dark:text-blue-300">
							Anyone with the link will be able to access this content.
						</p>
					</div>
				)}

				{!isPublic && (
					<>
						{/* Private Access Controls */}
						<div className="space-y-3">
							<div className="flex items-center gap-2">
								<Lock className="w-4 h-4 text-muted-foreground" />
								<span className="text-sm font-medium">การเข้าถึงแบบส่วนตัว</span>
								{selectedCount > 0 && <Badge variant="secondary">{selectedCount} คน</Badge>}
							</div>

							{/* Search */}
							<div className="relative">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="ค้นหาผู้มีส่วนร่วม"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-9"
								/>
							</div>

							{/* Bulk Actions */}
							{filteredParticipants.length > 0 && (
								<div className="flex items-center justify-between">
									<Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8 gap-2">
										{isAllSelected ? (
											<>
												<Square className="w-4 h-4" />
												ยกเลิกเลือกทั้งหมด
											</>
										) : (
											<>
												<CheckSquare className="w-4 h-4" />
												เลือกทั้งหมด
												{searchTerm && " (Filtered)"}
											</>
										)}
									</Button>

									{selectedCount > 0 && (
										<div className="text-sm text-muted-foreground">
											เลือก {selectedCount} จาก {all.length} ผู้มีส่วนร่วม
										</div>
									)}
								</div>
							)}

							{/* Participants List */}
							<ScrollArea className="h-64 rounded border">
								<div className="p-3 space-y-3">
									{filteredParticipants.length === 0 ? (
										<div className="text-center py-6">
											<Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
											<p className="text-sm text-muted-foreground">
												{searchTerm
													? "No participants match your search"
													: "No participants available"}
											</p>
										</div>
									) : (
										Object.entries(groupedParticipants).map(([kind, participants]) => (
											<div key={kind} className="space-y-2">
												<div className="flex items-center gap-2 px-1">
													<Badge variant="outline" className="text-xs">
														{kind}
													</Badge>
													<div className="h-px bg-border flex-1" />
													<span className="text-xs text-muted-foreground">
														{participants.length}
													</span>
												</div>
												<div className="space-y-1">
													{participants.map((p) => (
														<label
															key={p.id}
															className="flex items-center gap-3 px-2 py-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
														>
															<Checkbox
																checked={picked.has(p.id)}
																onCheckedChange={() => toggle(p.id)}
															/>
															<div className="flex-1 min-w-0">
																<p className="text-sm font-medium truncate">{p.name}</p>
															</div>
															{picked.has(p.id) ? (
																<UserCheck className="w-4 h-4 text-green-600" />
															) : (
																<UserX className="w-4 h-4 text-muted-foreground" />
															)}
														</label>
													))}
												</div>
											</div>
										))
									)}
								</div>
							</ScrollArea>
						</div>
					</>
				)}
			</div>

			<DialogFooter className="flex items-center justify-between">
				<div className="text-sm text-muted-foreground">
					{isPublic
						? "Public access enabled"
						: selectedCount === 0
							? "No participants selected"
							: `${selectedCount} ผู้มีส่วนร่วม${selectedCount !== 1 ? "" : ""} จะสามารถเข้าถึงข้อมูลนี้ได้`}
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={onClose}>
						ยกเลิก
					</Button>
					<Button onClick={onClose}>บันทึก</Button>
				</div>
			</DialogFooter>
		</DialogContent>
	);
}
