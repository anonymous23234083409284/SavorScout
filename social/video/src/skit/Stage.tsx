import React from 'react';
import {CAPTION, ROUND} from '../theme';
import {OUT} from './Cast';

// Where the scenes happen and the things the cast holds. Everything is drawn in the 1080 x 1920
// frame. A set has a back (behind the cast) and a front (the desk edge, in front of them).
//   dorm - Milo's side of the room: window, poster, string lights
//   door - Scout's side: the door and a corkboard, warmer because Scout is a flame
//   wide - both of them in the room
//   spot - a spotlight for close-ups of props (the visual gags)

export type SetName = 'dorm' | 'door' | 'wide' | 'spot';

const WALL_A = '#6552d6';
const WALL_B = '#4636a6';
const CREAM = '#ffe9c4';
const SAFFRON = '#ffc857';
const CORAL = '#ff8a5c';
const EMBER = '#ff5f1f';

const Lights: React.FC<{f: number}> = ({f}) => {
	const bulbs: [number, number][] = [
		[70, 262],
		[190, 300],
		[320, 312],
		[450, 296],
		[560, 266],
		[680, 240],
		[800, 232],
		[920, 244],
		[1030, 272],
	];
	return (
		<g>
			<path d="M -20 230 Q 270 370 560 266 Q 800 190 1100 300" stroke={OUT} strokeWidth={6} fill="none" />
			{bulbs.map(([x, y], i) => {
				const on = 0.75 + 0.25 * Math.sin(f / 9 + i * 1.7);
				const c = i % 2 ? CORAL : SAFFRON;
				return (
					<g key={i}>
						<circle cx={x} cy={y + 18} r={46} fill={c} opacity={0.2 * on} />
						<circle cx={x} cy={y + 18} r={17} fill={c} stroke={OUT} strokeWidth={5} opacity={0.6 + 0.4 * on} />
					</g>
				);
			})}
		</g>
	);
};

const Window: React.FC<{x: number; y: number; f: number}> = ({x, y, f}) => (
	<g transform={`translate(${x} ${y})`}>
		<rect x={-22} y={-22} width={404} height={564} rx={26} fill={CREAM} stroke={OUT} strokeWidth={9} />
		<rect x={0} y={0} width={360} height={520} rx={10} fill="#1a1440" stroke={OUT} strokeWidth={7} />
		<circle cx={262} cy={110} r={52} fill="#fff4c9" />
		<circle cx={240} cy={96} r={46} fill="#1a1440" opacity={0.25} />
		{[
			[60, 80],
			[130, 190],
			[70, 320],
			[300, 260],
			[210, 400],
			[120, 450],
		].map(([sx, sy], i) => (
			<circle key={i} cx={sx} cy={sy} r={5 + 2 * Math.sin(f / 7 + i)} fill="#fff" opacity={0.85} />
		))}
		<path d="M 180 0 L 180 520 M 0 260 L 360 260" stroke={CREAM} strokeWidth={16} />
		<rect x={-40} y={536} width={440} height={34} rx={12} fill={CREAM} stroke={OUT} strokeWidth={8} />
	</g>
);

const Poster: React.FC<{x: number; y: number}> = ({x, y}) => (
	<g transform={`translate(${x} ${y}) rotate(-4)`}>
		<rect x={0} y={0} width={300} height={380} rx={10} fill={CORAL} stroke={OUT} strokeWidth={8} />
		<path d="M 150 60 L 250 300 Q 150 344 50 300 Z" fill={SAFFRON} stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
		<path d="M 50 300 Q 150 344 250 300" stroke="#e79a3c" strokeWidth={22} fill="none" strokeLinecap="round" />
		<circle cx={150} cy={170} r={20} fill={EMBER} stroke={OUT} strokeWidth={6} />
		<circle cx={118} cy={246} r={18} fill={EMBER} stroke={OUT} strokeWidth={6} />
		<circle cx={184} cy={252} r={18} fill={EMBER} stroke={OUT} strokeWidth={6} />
		<circle cx={150} cy={-4} r={12} fill="#fff" stroke={OUT} strokeWidth={5} />
	</g>
);

const Door: React.FC = () => (
	<g>
		<rect x={70} y={500} width={420} height={1240} rx={14} fill="#352884" stroke={OUT} strokeWidth={9} />
		<rect x={100} y={530} width={360} height={1200} rx={8} fill="#4a3bb0" stroke={OUT} strokeWidth={7} />
		<rect x={140} y={580} width={280} height={420} rx={10} fill="none" stroke="#352884" strokeWidth={10} />
		<rect x={140} y={1060} width={280} height={520} rx={10} fill="none" stroke="#352884" strokeWidth={10} />
		<circle cx={420} cy={1030} r={22} fill={SAFFRON} stroke={OUT} strokeWidth={7} />
	</g>
);

const Corkboard: React.FC = () => (
	<g transform="translate(600 440)">
		<rect x={0} y={0} width={400} height={320} rx={12} fill="#c98b56" stroke={OUT} strokeWidth={9} />
		<rect x={36} y={40} width={120} height={120} fill="#fff6a8" stroke={OUT} strokeWidth={6} transform="rotate(-6 96 100)" />
		<rect x={190} y={56} width={150} height={100} fill="#fff" stroke={OUT} strokeWidth={6} transform="rotate(4 265 106)" />
		<rect x={70} y={190} width={110} height={100} fill="#ffb3c7" stroke={OUT} strokeWidth={6} transform="rotate(5 125 240)" />
		<rect x={220} y={184} width={130} height={110} fill="#b6f0e8" stroke={OUT} strokeWidth={6} transform="rotate(-3 285 239)" />
		{[
			[96, 50],
			[265, 64],
			[125, 196],
			[285, 190],
		].map(([px, py], i) => (
			<circle key={i} cx={px} cy={py} r={10} fill={EMBER} stroke={OUT} strokeWidth={5} />
		))}
	</g>
);

export const SetBack: React.FC<{set: SetName; f: number; uid: string}> = ({set, f, uid}) => {
	if (set === 'spot') {
		return (
			<g>
				<defs>
					<radialGradient id={`${uid}sp`} cx="50%" cy="46%" r="70%">
						<stop offset="0%" stopColor="#7a66f0" />
						<stop offset="60%" stopColor="#4534ad" />
						<stop offset="100%" stopColor="#231a5c" />
					</radialGradient>
				</defs>
				<rect x={0} y={0} width={1080} height={1920} fill={`url(#${uid}sp)`} />
				<g transform={`rotate(${f * 0.5} 540 880)`} opacity={0.1}>
					{Array.from({length: 12}).map((_, i) => (
						<path key={i} d="M 540 880 L 420 -900 L 660 -900 Z" fill="#fff" transform={`rotate(${i * 30} 540 880)`} />
					))}
				</g>
			</g>
		);
	}
	return (
		<g>
			<defs>
				<linearGradient id={`${uid}wall`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={WALL_A} />
					<stop offset="100%" stopColor={WALL_B} />
				</linearGradient>
				<radialGradient id={`${uid}warm`} cx="56%" cy="44%" r="60%">
					<stop offset="0%" stopColor="#ff9a3d" stopOpacity={0.5} />
					<stop offset="100%" stopColor="#ff9a3d" stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={0} y={0} width={1080} height={1920} fill={`url(#${uid}wall)`} />
			{set === 'dorm' ? (
				<g>
					<Poster x={56} y={470} />
					<Window x={640} y={430} f={f} />
				</g>
			) : null}
			{set === 'door' ? (
				<g>
					<Door />
					<Corkboard />
					<rect x={0} y={0} width={1080} height={1920} fill={`url(#${uid}warm)`} />
				</g>
			) : null}
			{set === 'wide' ? (
				<g>
					<Poster x={40} y={400} />
					<Window x={380} y={400} f={f} />
				</g>
			) : null}
			<Lights f={f} />
		</g>
	);
};

export const SetFront: React.FC<{set: SetName}> = ({set}) => {
	if (set === 'spot') {
		return null;
	}
	return (
		<g>
			{set !== 'door' ? (
				<g>
					<rect x={34} y={1404} width={370} height={230} rx={22} fill="#241a52" stroke={OUT} strokeWidth={9} />
					<circle cx={219} cy={1508} r={34} fill={SAFFRON} stroke={OUT} strokeWidth={7} />
					<path d="M 706 1452 L 872 1452 L 850 1620 L 728 1620 Z" fill="#fff" stroke={OUT} strokeWidth={9} strokeLinejoin="round" />
					<path d="M 712 1500 L 866 1500 L 860 1548 L 718 1548 Z" fill={EMBER} />
					<path d="M 760 1452 L 742 1330 M 800 1452 L 812 1322" stroke="#e8c79a" strokeWidth={12} strokeLinecap="round" />
				</g>
			) : null}
			<rect x={-10} y={1590} width={1100} height={340} fill="#d98652" stroke={OUT} strokeWidth={9} />
			<rect x={-10} y={1590} width={1100} height={26} fill="#f0a674" />
		</g>
	);
};

// ---- props --------------------------------------------------------------------------------

// A phone showing a bank balance: the numbers are the joke, so they're big and readable.
export const BalanceProp: React.FC<{amount: string; rows: [string, string][]; f: number}> = ({amount, rows, f}) => {
	const mx = 720 + Math.sin(f / 5) * 90;
	const my = 440 + Math.cos(f / 3.6) * 46;
	const flap = Math.sin(f * 1.6) * 26;
	return (
		<g>
			<rect x={190} y={300} width={700} height={1240} rx={70} fill="#16102a" stroke={OUT} strokeWidth={12} />
			<rect x={226} y={346} width={628} height={1148} rx={40} fill="#f7f4ff" />
			<rect x={440} y={362} width={200} height={34} rx={17} fill="#16102a" />
			<text x={540} y={500} textAnchor="middle" fontFamily={ROUND} fontWeight={600} fontSize={44} fill="#7a6fa3">
				Checking ••42
			</text>
			<text x={540} y={690} textAnchor="middle" fontFamily={CAPTION} fontSize={190} fill="#1d1230">
				{amount}
			</text>
			<text x={540} y={770} textAnchor="middle" fontFamily={ROUND} fontWeight={600} fontSize={42} fill="#7a6fa3">
				available balance
			</text>
			<line x1={270} y1={840} x2={810} y2={840} stroke="#ddd6f3" strokeWidth={5} />
			{rows.map(([what, cost], i) => (
				<g key={i}>
					<text x={276} y={930 + i * 120} fontFamily={ROUND} fontWeight={600} fontSize={42} fill="#3a2f5e">
						{what}
					</text>
					<text x={806} y={930 + i * 120} textAnchor="end" fontFamily={ROUND} fontWeight={700} fontSize={42} fill="#d6402b">
						{cost}
					</text>
					<line x1={270} y1={966 + i * 120} x2={810} y2={966 + i * 120} stroke="#ece7fb" strokeWidth={4} />
				</g>
			))}
			{/* the moth that lives in an empty wallet */}
			<g transform={`translate(${mx} ${my})`}>
				<path d={`M 0 0 Q -46 ${-40 - flap} -70 ${-6 - flap * 0.4} Q -44 22 0 8 Z`} fill="#b9aec4" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
				<path d={`M 0 0 Q 46 ${-40 - flap} 70 ${-6 - flap * 0.4} Q 44 22 0 8 Z`} fill="#b9aec4" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
				<ellipse cx={0} cy={6} rx={10} ry={24} fill="#6b5d80" stroke={OUT} strokeWidth={5} />
			</g>
		</g>
	);
};

// A handwritten plan on a sheet of paper. burn (0..1) burns it away from the bottom: Scout is a
// flame, and this is what Scout thinks of the plan.
export const PlanProp: React.FC<{title: string; lines: string[]; burn: number; f: number; uid: string; x?: number; y?: number; s?: number; tilt?: number}> = ({title, lines, burn, f, uid, x = 190, y = 420, s = 1, tilt = -4}) => {
	const W = 700;
	const H = 900;
	const edge = burn <= 0 ? H + 80 : H * (1 - burn);
	const wave = (px: number) => edge + Math.sin(px / 46 + f / 3) * 22 + Math.sin(px / 19 + f / 2) * 10;
	const xs = Array.from({length: 15}, (_, i) => (i * W) / 14);
	const clip = `M -20 -20 L ${W + 20} -20 L ${W + 20} ${wave(W)} ` + xs.reverse().map((px) => `L ${px} ${wave(px)}`).join(' ') + ' Z';
	const line = 'M ' + xs.map((px) => `${px} ${wave(px)}`).join(' L ');
	const gone = burn >= 0.995;
	return (
		<g transform={`translate(${x} ${y}) scale(${s}) rotate(${tilt} ${W / 2} ${H / 2})`}>
			{!gone ? (
				<g>
					<clipPath id={`${uid}burn`}>
						<path d={clip} />
					</clipPath>
					<g clipPath={`url(#${uid}burn)`}>
						<rect x={0} y={0} width={W} height={H} rx={16} fill="#fffaf0" stroke={OUT} strokeWidth={10} />
						<rect x={0} y={0} width={W} height={130} rx={16} fill="#ffe08a" />
						<text x={W / 2} y={92} textAnchor="middle" fontFamily={CAPTION} fontSize={78} fill={OUT}>
							{title}
						</text>
						{lines.map((t, i) => (
							<g key={i}>
								<rect x={44} y={196 + i * 172} width={56} height={56} rx={10} fill="none" stroke={OUT} strokeWidth={8} />
								{t.split('\n').map((part, j) => (
									<text key={j} x={128} y={240 + i * 172 + j * 62} fontFamily={ROUND} fontWeight={j === 0 ? 700 : 600} fontSize={j === 0 ? 52 : 46} fill={j === 0 ? OUT : '#5a4d80'}>
										{part}
									</text>
								))}
							</g>
						))}
						{burn > 0 ? <rect x={0} y={edge - 150} width={W} height={220} fill={`url(#${uid}char)`} /> : null}
					</g>
					{burn > 0 ? (
						<g>
							<defs>
								<linearGradient id={`${uid}char`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#3a1204" stopOpacity={0} />
									<stop offset="70%" stopColor="#3a1204" stopOpacity={0.75} />
									<stop offset="100%" stopColor="#1a0803" stopOpacity={1} />
								</linearGradient>
							</defs>
							<path d={line} stroke="#ff5f1f" strokeWidth={26} fill="none" strokeLinejoin="round" opacity={0.9} />
							<path d={line} stroke="#ffd36b" strokeWidth={10} fill="none" strokeLinejoin="round" />
						</g>
					) : null}
				</g>
			) : null}
			{burn > 0
				? Array.from({length: 22}).map((_, i) => {
						const seed = Math.sin(i * 91.7) * 1000;
						const r0 = seed - Math.floor(seed);
						const life = (f * 0.035 + r0 * 3) % 1;
						const px = ((i * 137) % W) + Math.sin(f / 6 + i) * 24;
						const py = Math.min(edge, H) - life * 420;
						return <circle key={i} cx={px} cy={py} r={(1 - life) * (7 + r0 * 9)} fill={i % 3 ? '#ffb347' : '#ff5f1f'} opacity={(1 - life) * (gone ? Math.max(0, 1 - (burn - 1) * 4) : 1)} />;
					})
				: null}
		</g>
	);
};
