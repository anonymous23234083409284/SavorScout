import React from 'react';
import {Composition} from 'remotion';
import sample from './sample-props.json';
import {Short} from './Short';
import {fontsLoaded} from './theme';
import type {ShortProps} from './types';

// Props come from social/pipeline (props.py) at render time. sample-props.json
// only seeds `npm run studio`, and needs a batch rendered first so its files exist.
export const Root: React.FC = () => (
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
);
