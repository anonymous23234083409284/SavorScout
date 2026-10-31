// Renders every video in a batch manifest: node render.mjs <manifest.json>
//
// The manifest lists {id, props, out} entries (social/pipeline/make_batch.py
// writes it). The project is bundled once and each video rendered from it.
// REMOTION_BROWSER points at a Chrome binary when one is already installed (a
// Claude cloud session); otherwise Remotion downloads its own headless shell.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const only = process.argv[3];
const browserExecutable = process.env.REMOTION_BROWSER || null;
const concurrency = Number(process.env.REMOTION_CONCURRENCY || 0) || null;

const serveUrl = await bundle({entryPoint: path.join(here, 'src', 'index.ts'), publicDir: path.join(here, 'public')});

for (const v of manifest.videos) {
	if (only && v.id !== only) continue;
	const t0 = Date.now();
	const composition = await selectComposition({serveUrl, id: 'Short', inputProps: v.props, browserExecutable});
	if (v.stills) {
		for (const s of v.stills) {
			await renderStill({composition, serveUrl, inputProps: v.props, frame: s.frame, output: s.out, browserExecutable});
		}
	}
	if (v.out) {
		await renderMedia({
			composition,
			serveUrl,
			inputProps: v.props,
			codec: 'h264',
			crf: 18,
			pixelFormat: 'yuv420p',
			audioBitrate: '192k',
			outputLocation: v.out,
			browserExecutable,
			concurrency,
			timeoutInMilliseconds: 120000,
		});
	}
	console.log(`${v.id}: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
