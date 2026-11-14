import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Milo, Scout, type Face, type Pose} from './Cast';

// The model sheet: every face and pose of the cast on one frame, for checking the drawings by eye.
//   node render.mjs <manifest with {composition: "CastSheet", stills: [{frame, out}]}>
const FACES: Face[] = ['neutral', 'panic', 'shock', 'deadpan', 'smug', 'happy', 'sad', 'squint', 'plead', 'determined'];
const POSES: Pose[] = ['idle', 'headgrab', 'armsup', 'point', 'shrug', 'phone', 'paper', 'chin', 'facepalm', 'present'];

export const CastSheet: React.FC<{frame?: number}> = ({frame = 20}) => (
	<AbsoluteFill style={{background: '#4a3aa8'}}>
		<svg width={3000} height={2000} viewBox="0 0 3000 2000">
			{FACES.map((face, i) => (
				<g key={`m${i}`} transform={`translate(${i * 300} 0) scale(0.5)`}>
					<Milo a={{face, pose: POSES[i], look: 'cam', mouth: i % 3 === 1 ? 0.7 : 0, f: frame + i * 7, uid: `m${i}`}} />
					<text x={300} y={960} textAnchor="middle" fontSize={44} fill="#fff" fontFamily="sans-serif">{`${face} / ${POSES[i]}`}</text>
				</g>
			))}
			{FACES.map((face, i) => (
				<g key={`s${i}`} transform={`translate(${i * 300} 520) scale(0.5)`}>
					<Scout a={{face, pose: POSES[i], look: i % 2 ? 'left' : 'cam', mouth: i % 3 === 2 ? 0.6 : 0, f: frame + i * 9, uid: `s${i}`}} />
					<text x={300} y={960} textAnchor="middle" fontSize={44} fill="#fff" fontFamily="sans-serif">{`${face} / ${POSES[i]}`}</text>
				</g>
			))}
			<g transform="translate(60 1040) scale(0.95)">
				<Milo a={{face: 'panic', pose: 'headgrab', look: 'cam', mouth: 0.8, f: frame, uid: 'bigm'}} />
			</g>
			<g transform="translate(700 1040) scale(0.95)">
				<Scout a={{face: 'deadpan', pose: 'idle', look: 'left', mouth: 0, f: frame, uid: 'bigs'}} />
			</g>
			<g transform="translate(1340 1040) scale(0.95)">
				<Milo a={{face: 'smug', pose: 'paper', look: 'right', mouth: 0, f: frame, uid: 'bigm2'}} />
			</g>
			<g transform="translate(1980 1040) scale(0.95)">
				<Scout a={{face: 'smug', pose: 'point', look: 'cam', mouth: 0.5, f: frame, uid: 'bigs2'}} />
			</g>
		</svg>
	</AbsoluteFill>
);
