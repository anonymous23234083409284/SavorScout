import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// SavorScout's palette, from src/App.css: the dark violet base and cards, the
// warm ember and saffron accents, and the two ink tiers.
export const C = {
	base: '#0c0912',
	raised: '#13101c',
	card: '#1a1626',
	elevated: '#241f33',
	ember: '#ff5f1f',
	saffron: '#ffc857',
	coral: '#ff8a5c',
	ink: '#fdf8f2',
	inkSoft: '#b9aec4',
	inkMid: '#8d84a0',
	onAccent: '#1a0d06',
};

export const ACCENT_GRADIENT = `linear-gradient(100deg, ${C.ember} 0%, ${C.coral} 55%, ${C.saffron} 100%)`;

// Unique family names, so a system copy of Inter can never stand in for the
// files shipped in public/fonts.
export const DISPLAY = 'SS Display';
export const TEXT = 'SS Text';

export const fontsLoaded = Promise.all([
	loadFont({family: DISPLAY, url: staticFile('fonts/InterDisplay-Black.otf'), weight: '900'}),
	loadFont({family: DISPLAY, url: staticFile('fonts/InterDisplay-ExtraBold.otf'), weight: '800'}),
	loadFont({family: TEXT, url: staticFile('fonts/Inter-SemiBold.otf'), weight: '600'}),
	loadFont({family: TEXT, url: staticFile('fonts/Inter-Bold.otf'), weight: '700'}),
]);

// Layout, in the 1080x1920 frame. TikTok draws its own UI over the top ~160px,
// a button rail on the right from ~y820 to ~y1560, and the caption below
// ~y1560, so words and pins stay inside these lines.
export const LAYOUT = {
	progressY: 172,
	brandY: 200,
	infoTop: 286,
	sideX: 64,
	card: {left: 40, top: 812, width: 1000, height: 690, radius: 44},
	// The part of the card where pins and routes are framed: clear of the rail.
	safe: {left: 70, top: 70, right: 170, bottom: 90},
};
