import React from 'react';
import {Composition} from 'remotion';
import {Reel, type ReelProps} from './Reel';
import sample from './sample-props.json';
import {Short} from './Short';
import {fontsLoaded} from './theme';
import type {ShortProps} from './types';

// Props come from social/pipeline at render time: props.py for "Short" (the
// walkable-five format), reel.py for "Reel" (scripted, creator-style videos).
// sample-props.json only seeds `npm run studio`, and needs a batch rendered
// first so its files exist.
export const Root: React.FC = () => (
	<>
		<Composition
			id="Short"
			component={Short}
			width={1080}
			height={1920}
			fps={30}
			durationInFrames={630}
			defaultProps={sample as unknown as ShortProps}
			calculateMetadata={async ({props}) => {
				await fontsLoaded;
				const t = props.timing;
				return {durationInFrames: t.hook + props.map.spots.length * t.spot + t.outro};
			}}
		/>
		<Composition
			id="Reel"
			component={Reel}
			width={1080}
			height={1920}
			fps={30}
			durationInFrames={900}
			defaultProps={{scenes: [], audio: '', total: 900, bpm: 120, site: 'savorscout.net', credits: ''} as ReelProps}
			calculateMetadata={async ({props}) => {
				await fontsLoaded;
				return {durationInFrames: Math.max(1, props.total)};
			}}
		/>
	</>
);
