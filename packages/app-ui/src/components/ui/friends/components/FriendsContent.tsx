import type { FriendItem } from "@workspace/app-ui/types/friends";

import { FriendRow } from "./FriendRow";
import { FriendSection } from "./FriendSection";
import { EmptyState, NoResults, SkeletonRow } from "./FriendsEmptyState";

type FriendsContentProps = {
	actionLoading: string | null;
	filteredFriends: FriendItem[];
	filteredIncoming: FriendItem[];
	filteredOutgoing: FriendItem[];
	isEmpty: boolean;
	loading: boolean;
	onAccept: (friendId: string) => void;
	onAddFriend: () => void;
	onCancel: (friendId: string) => void;
	onReject: (friendId: string) => void;
	onRemove: (friendId: string) => void;
	query: string;
	showNoResults: boolean;
	totalCount: number;
};

export function FriendsContent({
	actionLoading,
	filteredFriends,
	filteredIncoming,
	filteredOutgoing,
	isEmpty,
	loading,
	onAccept,
	onAddFriend,
	onCancel,
	onReject,
	onRemove,
	query,
	showNoResults,
	totalCount,
}: FriendsContentProps) {
	if (loading && totalCount === 0) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, index) => (
					<SkeletonRow key={index} />
				))}
			</div>
		);
	}

	if (isEmpty) {
		return (
			<EmptyState
				title="ยังไม่มีเพื่อน"
				description="เพิ่มเพื่อนเพื่อเริ่มแชร์ไฟล์ได้โดยตรง"
				onAddFriend={onAddFriend}
			/>
		);
	}

	if (showNoResults) {
		return <NoResults query={query} />;
	}

	return (
		<>
			{filteredIncoming.length > 0 ? (
				<FriendSection title="คำขอที่ได้รับ" count={filteredIncoming.length}>
					{filteredIncoming.map((friend) => (
						<FriendRow
							key={friend.friendId}
							friend={friend}
							loading={actionLoading === friend.friendId}
							onAccept={onAccept}
							onReject={onReject}
						/>
					))}
				</FriendSection>
			) : null}

			{filteredOutgoing.length > 0 ? (
				<FriendSection title="คำขอที่ส่งไป" count={filteredOutgoing.length}>
					{filteredOutgoing.map((friend) => (
						<FriendRow
							key={friend.friendId}
							friend={friend}
							loading={actionLoading === friend.friendId}
							onCancel={onCancel}
						/>
					))}
				</FriendSection>
			) : null}

			{filteredFriends.length > 0 ? (
				<FriendSection title="เพื่อน" count={filteredFriends.length}>
					{filteredFriends.map((friend) => (
						<FriendRow
							key={friend.friendId}
							friend={friend}
							loading={actionLoading === friend.friendId}
							onRemove={onRemove}
						/>
					))}
				</FriendSection>
			) : null}
		</>
	);
}
