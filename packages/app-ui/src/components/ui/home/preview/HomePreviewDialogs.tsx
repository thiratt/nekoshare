import { HomePreviewAudioDialog } from "./HomePreviewAudioDialog";
import { HomePreviewImageDialog } from "./HomePreviewImageDialog";
import { HomePreviewPdfDialog } from "./HomePreviewPdfDialog";
import { HomePreviewTextDialog } from "./HomePreviewTextDialog";
import { HomePreviewVideoDialog } from "./HomePreviewVideoDialog";
import type {
	HomePreviewAudioItem,
	HomePreviewImageItem,
	HomePreviewPdfItem,
	HomePreviewTextItem,
	HomePreviewVideoItem,
} from "./preview-types";

type HomePreviewDialogsProps = {
	audio: HomePreviewAudioItem | null;
	image: HomePreviewImageItem | null;
	pdf: HomePreviewPdfItem | null;
	text: HomePreviewTextItem | null;
	video: HomePreviewVideoItem | null;
	onCloseAudio: () => void;
	onCloseImage: () => void;
	onClosePdf: () => void;
	onCloseText: () => void;
	onCloseVideo: () => void;
};

export function HomePreviewDialogs({
	audio,
	image,
	onCloseAudio,
	onCloseImage,
	onClosePdf,
	onCloseText,
	onCloseVideo,
	pdf,
	text,
	video,
}: HomePreviewDialogsProps) {
	return (
		<>
			<HomePreviewImageDialog
				show={image !== null}
				image={image ?? undefined}
				canGoPrevious={false}
				canGoNext={false}
				onClose={onCloseImage}
			/>
			<HomePreviewTextDialog show={text !== null} text={text ?? undefined} onClose={onCloseText} />
			<HomePreviewPdfDialog show={pdf !== null} pdf={pdf ?? undefined} onClose={onClosePdf} />
			<HomePreviewVideoDialog show={video !== null} video={video ?? undefined} onClose={onCloseVideo} />
			<HomePreviewAudioDialog show={audio !== null} audio={audio ?? undefined} onClose={onCloseAudio} />
		</>
	);
}
