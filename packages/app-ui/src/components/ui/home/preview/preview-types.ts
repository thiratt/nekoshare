export type HomePreviewAudioItem = {
	id?: string;
	src: string;
	name: string;
	sizeLabel?: string;
	durationLabel?: string;
	codecLabel?: string;
	description?: string;
};

export type HomePreviewImageItem = {
	id?: string;
	src: string;
	name: string;
	alt?: string;
	sizeLabel?: string;
	typeLabel?: string;
	description?: string;
};

export type HomePreviewPdfItem = {
	id?: string;
	src: string;
	name: string;
	sizeLabel?: string;
	description?: string;
};

export type HomePreviewTextItem = {
	id?: string;
	name: string;
	content: string;
	languageLabel?: string;
	sizeLabel?: string;
};

export type HomePreviewVideoItem = {
	id?: string;
	src: string;
	name: string;
	sizeLabel?: string;
	durationLabel?: string;
	codecLabel?: string;
	description?: string;
	poster?: string;
};
