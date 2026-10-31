export type Pt = [number, number];

export type Spot = {
	name: string;
	category: string;
	street: string;
	walk_min: number;
	walk_m: number;
	walk_mi: number;
	mi: number;
	x: number;
	y: number;
	route: Pt[];
	// Name set by the pipeline to fit: font size in px and the wrapped lines.
	nameSize: number;
	nameLines: string[];
};

export type MapData = {
	src: string;
	width: number;
	height: number;
	scale: number; // map pixels per metre
	campus: {x: number; y: number; label: string};
	spots: Spot[];
	labels: {name: string; x: number; y: number; angle: number}[];
	attribution: string;
};

export type ShortProps = {
	campus: string;
	count: number;
	nounPlural: string;
	hook: {
		kicker: string;
		big: string;
		bigSize: number;
		line: string;
		lineSize: number;
		sub: string;
	};
	outro: {more: string; moreSize: number; line: string; site: string; follow: string};
	map: MapData;
	clips: string[];
	audio: string | null;
	timing: {hook: number; spot: number; outro: number};
	credits: string;
};

export type Timeline = {
	hook: number;
	spot: (k: number) => number;
	spotLen: number;
	outro: number;
	total: number;
	n: number;
};

export const timeline = (t: ShortProps['timing'], n: number): Timeline => ({
	hook: t.hook,
	spot: (k: number) => t.hook + k * t.spot,
	spotLen: t.spot,
	outro: t.hook + n * t.spot,
	total: t.hook + n * t.spot + t.outro,
	n,
});
