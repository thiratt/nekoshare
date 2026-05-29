import { useCallback, useMemo, useRef } from "react";

import { createFileRoute } from "@tanstack/react-router";

import {
	transformDevices,
	transformFriends,
} from "@workspace/app-ui/components/ui/drop-overlay/index";
import { type HomeDropHandle, HomeUI } from "@workspace/app-ui/components/ui/home/index";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import { useFriends } from "@workspace/app-ui/hooks/use-friends";

import {
	resolveAudioPreview,
	resolveDroppedPaths,
	resolveImagePreview,
	resolvePdfPreview,
	resolveTextPreview,
	resolveVideoPreview,
} from "./file-preview";

import { type NativeDropZonePayload, useNativeDropZones } from "@/hooks/use-native-drop-zones";

export const Route = createFileRoute("/(app)/home/")({
	component: RouteComponent,
});

function RouteComponent() {
	const homeRef = useRef<HomeDropHandle | null>(null);
	const { devices: rawDevices } = useDevices();
	const { friends: rawFriends } = useFriends();

	const devices = useMemo(
		() => transformDevices(rawDevices, { excludeCurrentDevice: true }),
		[rawDevices],
	);
	const friends = useMemo(() => transformFriends(rawFriends), [rawFriends]);

	const handleNativeDropEvent = useCallback(async (event: NativeDropZonePayload) => {
		if (event.type !== "drop" || event.paths.length === 0) return;
		if (event.zone?.id !== "home-file-stage") return;

		const entries = await resolveDroppedPaths(event.paths);
		homeRef.current?.addDroppedPaths(entries);
	}, []);

	const dropState = useNativeDropZones({
		onEvent: handleNativeDropEvent,
	});

	return (
		<HomeUI
			ref={homeRef}
			devices={devices}
			friends={friends}
			dropState={dropState}
			onResolveAudioPreview={resolveAudioPreview}
			onResolveImagePreview={resolveImagePreview}
			onResolvePdfPreview={resolvePdfPreview}
			onResolveTextPreview={resolveTextPreview}
			onResolveVideoPreview={resolveVideoPreview}
		/>
	);
}
