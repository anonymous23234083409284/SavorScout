import React from 'react';

// The show's cast, drawn in code so every episode can be made without footage or actors.
//   Milo  - the student: broke, dramatic, confident in terrible plans.
//   Scout - SavorScout's flame: calm, dry, knows every place to eat near every campus.
// A character is drawn in its own 600 x 1000 box (head near the top, body running off the bottom)
// and placed by the shot. Acting is three things: a face, a pose, and a mouth that follows the
// voice (0..1 per frame, from the line's loudness).

export type Face = 'neutral' | 'panic' | 'shock' | 'deadpan' | 'smug' | 'happy' | 'sad' | 'squint' | 'plead' | 'determined';
export type Pose = 'idle' | 'headgrab' | 'armsup' | 'point' | 'shrug' | 'phone' | 'paper' | 'chin' | 'facepalm' | 'present';
export type Look = 'cam' | 'left' | 'right' | 'down' | 'up';
export type Acting = {face: Face; pose: Pose; look: Look; mouth: number; f: number; uid: string};

export const OUT = '#1d1230';
const SKIN = '#f2b88f';
const SKIN_SH = '#dd9b72';
const HAIR = '#2b1a45';
const HOODIE = '#20c7b5';
const HOODIE_SH = '#17a394';
const MOUTH = '#4a1424';
const TONGUE = '#f06f83';

type MouthShape = 'smile' | 'flat' | 'firm' | 'frown' | 'smirk' | 'grin' | 'grit' | 'o' | 'wobble';
type FaceSpec = {bl: number; br: number; by: number; lid: number; eye: number; pupil: number; mouth: MouthShape; sweat?: boolean; lower?: number; wide?: boolean};
// bl / br: how far each brow's inner end is raised, in degrees (positive = worried, negative = angry).
// by: brow height (negative = raised). lid: how closed the upper lid is. lower: lower lid (smiling eyes).
const FACES: Record<Face, FaceSpec> = {
	neutral: {bl: 0, br: 0, by: 0, lid: 0.14, eye: 1, pupil: 1, mouth: 'smile'},
	panic: {bl: 24, br: 24, by: -24, lid: 0, eye: 1.2, pupil: 0.6, mouth: 'grit', sweat: true, wide: true},
	shock: {bl: 8, br: 8, by: -36, lid: 0, eye: 1.26, pupil: 0.55, mouth: 'o'},
	deadpan: {bl: 0, br: 0, by: 14, lid: 0.5, eye: 1, pupil: 1, mouth: 'flat'},
	smug: {bl: -8, br: 16, by: -2, lid: 0.42, eye: 1, pupil: 1, mouth: 'smirk'},
	happy: {bl: -4, br: -4, by: -12, lid: 0.06, eye: 1.05, pupil: 1.08, mouth: 'grin', lower: 0.22},
	sad: {bl: 26, br: 26, by: 4, lid: 0.3, eye: 1, pupil: 1, mouth: 'frown'},
	squint: {bl: -14, br: -14, by: 14, lid: 0.56, eye: 1, pupil: 0.9, mouth: 'flat', lower: 0.2},
	plead: {bl: 30, br: 30, by: -8, lid: 0.04, eye: 1.2, pupil: 1.3, mouth: 'wobble'},
	determined: {bl: -16, br: -16, by: 8, lid: 0.2, eye: 1, pupil: 0.95, mouth: 'firm'},
};

const LOOKS: Record<Look, [number, number]> = {cam: [0, 0], left: [-15, 2], right: [15, 2], down: [0, 16], up: [0, -14]};

// A blink every ~3.4 s, three frames long (never while wide-eyed).
const blink = (f: number, off: number) => {
	const k = (f + off) % 102;
	return k < 3 ? 1 : 0;
};

const Eye: React.FC<{cx: number; cy: number; spec: FaceSpec; look: [number, number]; lidColor: string; uid: string; closed: number; rx?: number; ry?: number; pupil?: string}> = ({
	cx,
	cy,
	spec,
	look,
	lidColor,
	uid,
	closed,
	rx = 46,
	ry = 54,
	pupil = OUT,
}) => {
	const ex = rx * spec.eye;
	const ey = ry * spec.eye;
	const lid = Math.max(spec.lid, closed);
	const lidY = cy - ey + 2 * ey * lid;
	const pr = 23 * spec.pupil * (rx / 46);
	const px = cx + look[0] * (rx / 46);
	const py = cy + look[1] * (ry / 54) + (lid > 0.3 ? 6 : 0);
	const lowerY = cy + ey - 2 * ey * (spec.lower ?? 0);
	return (
		<g>
			<clipPath id={uid}>
				<ellipse cx={cx} cy={cy} rx={ex} ry={ey} />
			</clipPath>
			<ellipse cx={cx} cy={cy} rx={ex} ry={ey} fill="#fff" stroke={OUT} strokeWidth={8} />
			<g clipPath={`url(#${uid})`}>
				<circle cx={px} cy={py} r={pr} fill={pupil} />
				<circle cx={px - pr * 0.35} cy={py - pr * 0.4} r={pr * 0.32} fill="#fff" />
				{spec.pupil > 1.2 ? <circle cx={px + pr * 0.35} cy={py + pr * 0.3} r={pr * 0.18} fill="#fff" /> : null}
				{lid > 0.02 ? <rect x={cx - ex - 6} y={cy - ey - 6} width={2 * ex + 12} height={lidY - (cy - ey) + 6} fill={lidColor} /> : null}
				{lid > 0.02 ? <line x1={cx - ex} y1={lidY} x2={cx + ex} y2={lidY} stroke={OUT} strokeWidth={8} /> : null}
				{spec.lower ? <rect x={cx - ex - 6} y={lowerY} width={2 * ex + 12} height={ey} fill={lidColor} /> : null}
				{spec.lower ? <path d={`M ${cx - ex} ${lowerY + 6} Q ${cx} ${lowerY - 12} ${cx + ex} ${lowerY + 6}`} stroke={OUT} strokeWidth={8} fill="none" /> : null}
			</g>
			<ellipse cx={cx} cy={cy} rx={ex} ry={ey} fill="none" stroke={OUT} strokeWidth={8} />
		</g>
	);
};

const Mouth: React.FC<{cx: number; cy: number; shape: MouthShape; m: number; wide?: boolean; uid: string; k?: number; ink?: string}> = ({cx, cy, shape, m, wide, uid, k = 1, ink = OUT}) => {
	const P = (dx: number, dy: number) => `${cx + dx * k} ${cy + dy * k}`;
	if (m > 0.1) {
		const rx = (wide ? 54 : 40 + 10 * m) * k;
		const ry = (8 + 48 * m) * k;
		return (
			<g>
				<clipPath id={uid}>
					<ellipse cx={cx} cy={cy + 2} rx={rx} ry={ry} />
				</clipPath>
				<ellipse cx={cx} cy={cy + 2} rx={rx} ry={ry} fill={MOUTH} />
				<g clipPath={`url(#${uid})`}>
					<ellipse cx={cx} cy={cy + 2 + ry * 0.62} rx={rx * 0.62} ry={ry * 0.5} fill={TONGUE} />
					{m > 0.28 ? <rect x={cx - rx} y={cy + 2 - ry - 4} width={2 * rx} height={ry * 0.42 + 4} fill="#fff" /> : null}
				</g>
				<ellipse cx={cx} cy={cy + 2} rx={rx} ry={ry} fill="none" stroke={ink} strokeWidth={8 * k} />
			</g>
		);
	}
	const line = {stroke: ink, strokeWidth: 9 * k, strokeLinecap: 'round' as const, fill: 'none'};
	switch (shape) {
		case 'smile':
			return <path d={`M ${P(-42, -6)} Q ${P(0, 26)} ${P(42, -6)}`} {...line} />;
		case 'flat':
			return <path d={`M ${P(-38, 2)} L ${P(38, 2)}`} {...line} />;
		case 'firm':
			return <path d={`M ${P(-36, 8)} Q ${P(-30, 0)} ${P(0, 2)} Q ${P(30, 0)} ${P(36, 8)}`} {...line} />;
		case 'frown':
			return <path d={`M ${P(-40, 14)} Q ${P(0, -16)} ${P(40, 14)}`} {...line} />;
		case 'smirk':
			return <path d={`M ${P(-38, 6)} Q ${P(12, 10)} ${P(46, -18)}`} {...line} />;
		case 'wobble':
			return <path d={`M ${P(-34, 8)} Q ${P(-17, -6)} ${P(0, 8)} Q ${P(17, 22)} ${P(34, 8)}`} {...line} />;
		case 'o':
			return <ellipse cx={cx} cy={cy + 4} rx={20 * k} ry={27 * k} fill={MOUTH} stroke={ink} strokeWidth={8 * k} />;
		case 'grin':
			return (
				<g>
					<path d={`M ${P(-54, -16)} Q ${P(0, 66)} ${P(54, -16)} Z`} fill={MOUTH} stroke={ink} strokeWidth={8 * k} strokeLinejoin="round" />
					<path d={`M ${P(-46, -12)} Q ${P(0, 8)} ${P(46, -12)} Q ${P(0, 22)} ${P(-46, -12)} Z`} fill="#fff" />
				</g>
			);
		case 'grit':
			return (
				<g>
					<rect x={cx - 56 * k} y={cy - 26 * k} width={112 * k} height={54 * k} rx={18 * k} fill="#fff" stroke={ink} strokeWidth={8 * k} />
					<path d={`M ${P(-56, 1)} L ${P(56, 1)} M ${P(-28, -26)} L ${P(-28, 28)} M ${P(0, -26)} L ${P(0, 28)} M ${P(28, -26)} L ${P(28, 28)}`} stroke={ink} strokeWidth={5 * k} />
				</g>
			);
	}
};

type Pt = [number, number];
const Limb: React.FC<{pts: Pt[]; color: string; w?: number}> = ({pts, color, w = 74}) => {
	const d = 'M ' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L ');
	return (
		<g fill="none" strokeLinecap="round" strokeLinejoin="round">
			<path d={d} stroke={OUT} strokeWidth={w + 16} />
			<path d={d} stroke={color} strokeWidth={w} />
		</g>
	);
};
const Hand: React.FC<{at: Pt; color?: string; r?: number; finger?: Pt}> = ({at, color = SKIN, r = 42, finger}) => (
	<g>
		{finger ? (
			<g strokeLinecap="round">
				<line x1={at[0]} y1={at[1]} x2={finger[0]} y2={finger[1]} stroke={OUT} strokeWidth={38} />
				<line x1={at[0]} y1={at[1]} x2={finger[0]} y2={finger[1]} stroke={color} strokeWidth={22} />
			</g>
		) : null}
		<circle cx={at[0]} cy={at[1]} r={r} fill={color} stroke={OUT} strokeWidth={8} />
	</g>
);

// ---- Milo ---------------------------------------------------------------------------------

// [shoulder, elbow, hand] for the left and right arm (as seen on screen).
const MILO_ARMS: Record<Pose, {l: Pt[]; r: Pt[]; front: boolean}> = {
	idle: {l: [[150, 640], [104, 800], [128, 960]], r: [[450, 640], [496, 800], [472, 960]], front: false},
	headgrab: {l: [[150, 640], [34, 500], [142, 262]], r: [[450, 640], [566, 500], [458, 262]], front: true},
	armsup: {l: [[150, 640], [52, 520], [36, 318]], r: [[450, 640], [548, 520], [564, 318]], front: true},
	point: {l: [[150, 640], [104, 800], [128, 960]], r: [[450, 640], [548, 600], [600, 470]], front: true},
	shrug: {l: [[150, 630], [58, 690], [10, 578]], r: [[450, 630], [542, 690], [590, 578]], front: true},
	phone: {l: [[150, 640], [104, 800], [128, 960]], r: [[450, 640], [540, 760], [404, 668]], front: true},
	paper: {l: [[150, 640], [104, 800], [128, 960]], r: [[450, 640], [566, 640], [520, 470]], front: true},
	chin: {l: [[150, 640], [104, 800], [128, 960]], r: [[450, 640], [520, 620], [356, 480]], front: true},
	facepalm: {l: [[150, 640], [104, 800], [128, 960]], r: [[450, 640], [540, 480], [312, 300]], front: true},
	present: {l: [[150, 640], [104, 800], [128, 960]], r: [[450, 640], [560, 700], [590, 560]], front: true},
};

export const Milo: React.FC<{a: Acting}> = ({a}) => {
	const spec = FACES[a.face];
	const look = LOOKS[a.look];
	const f = a.f;
	const panic = a.face === 'panic';
	const jx = panic ? Math.sin(f * 2.9) * 4 : 0;
	const jy = panic ? Math.cos(f * 3.7) * 3 : 0;
	const breathe = Math.sin(f / 14) * 3;
	const bob = a.mouth > 0.1 ? Math.sin(f / 1.7) * 4 * a.mouth : 0;
	const shrug = a.pose === 'shrug' ? -16 : 0;
	const arms = MILO_ARMS[a.pose];
	const wob = (p: Pt, k: number): Pt => [p[0] + (a.pose === 'headgrab' ? Math.sin(f * 2.3 + k) * 5 : a.pose === 'armsup' ? Math.sin(f / 2.2 + k) * 14 : 0), p[1] + (a.pose === 'armsup' ? Math.cos(f / 2.6 + k) * 8 : 0)];
	const L = [arms.l[0], arms.l[1], wob(arms.l[2], 0)] as Pt[];
	const R = [arms.r[0], arms.r[1], wob(arms.r[2], 2)] as Pt[];
	const closed = spec.eye > 1.1 ? 0 : blink(f, 11);
	const curls: [number, number, number][] = [
		[150, 236, 52],
		[178, 162, 70],
		[250, 112, 80],
		[334, 100, 84],
		[414, 138, 76],
		[456, 214, 54],
		[300, 150, 90],
	];
	const armsEl = (
		<g>
			<Limb pts={L} color={HOODIE} />
			<Limb pts={R} color={HOODIE} />
			{a.pose === 'phone' ? (
				<g transform={`rotate(-12 ${R[2][0]} ${R[2][1]})`}>
					<rect x={R[2][0] - 52} y={R[2][1] - 150} width={104} height={190} rx={18} fill="#16102a" stroke={OUT} strokeWidth={8} />
					<rect x={R[2][0] - 40} y={R[2][1] - 134} width={80} height={150} rx={8} fill="#bfe9ff" opacity={0.9} />
				</g>
			) : null}
			{a.pose === 'paper' ? (
				<g transform={`rotate(9 ${R[2][0]} ${R[2][1]})`}>
					<rect x={R[2][0] - 96} y={R[2][1] - 250} width={196} height={250} rx={8} fill="#fffaf0" stroke={OUT} strokeWidth={8} />
					<rect x={R[2][0] - 96} y={R[2][1] - 250} width={196} height={48} rx={8} fill="#ffe08a" stroke={OUT} strokeWidth={8} />
					<path d={`M ${R[2][0] - 70} ${R[2][1] - 164} l 144 0 M ${R[2][0] - 70} ${R[2][1] - 124} l 120 0 M ${R[2][0] - 70} ${R[2][1] - 84} l 136 0`} stroke="#b8a9d9" strokeWidth={9} strokeLinecap="round" />
				</g>
			) : null}
			<Hand at={L[2]} />
			<Hand at={R[2]} finger={a.pose === 'point' ? [R[2][0] + 54, R[2][1] - 34] : undefined} />
		</g>
	);
	return (
		<g transform={`translate(${jx} ${jy})`}>
			{/* body */}
			<g transform={`translate(0 ${breathe + shrug})`}>
				<ellipse cx={300} cy={560} rx={168} ry={66} fill={HOODIE_SH} stroke={OUT} strokeWidth={9} />
				<path d="M 96 1010 L 122 660 Q 134 574 236 556 L 364 556 Q 466 574 478 660 L 504 1010 Z" fill={HOODIE} stroke={OUT} strokeWidth={9} strokeLinejoin="round" />
				<path d="M 236 556 Q 300 640 364 556" fill={HOODIE_SH} stroke={OUT} strokeWidth={8} />
				<path d="M 268 600 L 262 700 M 332 600 L 338 700" stroke="#fff" strokeWidth={10} strokeLinecap="round" />
				<path d="M 214 842 L 386 842 L 372 930 L 228 930 Z" fill={HOODIE_SH} opacity={0.55} />
			</g>
			{!arms.front ? armsEl : null}
			{/* head */}
			<g transform={`translate(0 ${bob + shrug * 0.5})`}>
				<rect x={262} y={440} width={76} height={120} fill={SKIN_SH} stroke={OUT} strokeWidth={8} />
				<ellipse cx={126} cy={318} rx={28} ry={40} fill={SKIN} stroke={OUT} strokeWidth={8} />
				<ellipse cx={474} cy={318} rx={28} ry={40} fill={SKIN} stroke={OUT} strokeWidth={8} />
				<ellipse cx={300} cy={300} rx={172} ry={182} fill={SKIN} stroke={OUT} strokeWidth={9} />
				<ellipse cx={206} cy={372} rx={30} ry={18} fill="#f39a86" opacity={0.5} />
				<ellipse cx={394} cy={372} rx={30} ry={18} fill="#f39a86" opacity={0.5} />
				{curls.map(([x, y, r], i) => (
					<circle key={`o${i}`} cx={x} cy={y} r={r} fill={OUT} stroke={OUT} strokeWidth={18} />
				))}
				{curls.map(([x, y, r], i) => (
					<circle key={`h${i}`} cx={x} cy={y} r={r} fill={HAIR} />
				))}
				<path d="M 232 96 Q 262 70 292 96 M 330 88 Q 364 70 388 104 M 190 176 Q 214 150 240 172" stroke="#4a3270" strokeWidth={8} strokeLinecap="round" fill="none" />
				<Eye cx={232} cy={306} spec={spec} look={look} lidColor={SKIN} uid={`${a.uid}el`} closed={closed} />
				<Eye cx={368} cy={306} spec={spec} look={look} lidColor={SKIN} uid={`${a.uid}er`} closed={closed} />
				<g transform={`translate(0 ${spec.by})`}>
					<rect x={186} y={214} width={92} height={20} rx={10} fill={OUT} transform={`rotate(${-spec.bl} 232 224)`} />
					<rect x={322} y={214} width={92} height={20} rx={10} fill={OUT} transform={`rotate(${spec.br} 368 224)`} />
				</g>
				<path d="M 292 348 Q 300 366 312 350" stroke={SKIN_SH} strokeWidth={8} strokeLinecap="round" fill="none" />
				<Mouth cx={300} cy={412} shape={spec.mouth} m={a.mouth} wide={spec.wide} uid={`${a.uid}m`} />
				{spec.sweat ? (
					<g fill="#8fdcff" stroke={OUT} strokeWidth={6}>
						<path d={`M 462 ${150 + ((f * 3) % 60)} q -18 30 0 42 q 18 -12 0 -42 Z`} />
						<path d={`M 134 ${190 + ((f * 3 + 30) % 60)} q -14 24 0 34 q 14 -10 0 -34 Z`} />
					</g>
				) : null}
			</g>
			{arms.front ? armsEl : null}
		</g>
	);
};

// ---- Scout --------------------------------------------------------------------------------

const EMBER = '#ff5f1f';
const SAFFRON = '#ffc857';
const F_OUT = '#7a1f05';
const F_INK = '#3a1204';

const SCOUT_HANDS: Record<Pose, {l: Pt; r: Pt; finger?: Pt}> = {
	idle: {l: [78, 650], r: [522, 650]},
	headgrab: {l: [150, 470], r: [450, 470]},
	armsup: {l: [50, 430], r: [550, 430]},
	point: {l: [78, 650], r: [560, 560], finger: [616, 536]},
	shrug: {l: [40, 580], r: [560, 580]},
	phone: {l: [78, 650], r: [480, 640]},
	paper: {l: [78, 650], r: [470, 690]},
	chin: {l: [78, 650], r: [372, 706]},
	facepalm: {l: [78, 650], r: [330, 540]},
	present: {l: [78, 650], r: [566, 610]},
};

export const Scout: React.FC<{a: Acting; glow?: boolean}> = ({a, glow = true}) => {
	const spec = FACES[a.face];
	const look = LOOKS[a.look];
	const f = a.f;
	const float = Math.sin(f / 11) * 12;
	const s1 = Math.sin(f / 4.3) * 14;
	const s2 = Math.sin(f / 3.1 + 1.3) * 10;
	const s3 = Math.cos(f / 5.2) * 8;
	const talk = a.mouth > 0.1 ? 1 + 0.02 * a.mouth : 1;
	const outer = `M 300 800 C 150 800 70 690 90 560 C 105 470 175 430 190 330 C 200 270 ${175 + s2} ${230 + s3} ${215 + s2} ${150 + s3} C 235 210 280 220 300 180 C 320 130 ${300 + s1} ${90 + s3} ${345 + s1} ${40 + s3 * 0.6} C 370 130 450 180 470 300 C 480 360 455 400 485 450 C 530 520 530 600 505 670 C 475 750 400 800 300 800 Z`;
	const inner = `M 300 772 C 190 772 128 692 144 592 C 158 512 228 472 ${248 + s2 * 0.5} ${388 + s3} C 272 436 328 426 ${350 + s1 * 0.5} ${342 + s3} C 380 424 442 472 456 572 C 470 682 400 772 300 772 Z`;
	const hands = SCOUT_HANDS[a.pose];
	const hb = (p: Pt, k: number): Pt => [p[0] + Math.sin(f / 9 + k) * 5, p[1] + Math.cos(f / 7 + k) * 7];
	const hl = hb(hands.l, 0);
	const hr = hb(hands.r, 2);
	const closed = spec.eye > 1.1 ? 0 : blink(f, 47);
	return (
		<g transform={`translate(0 ${float})`}>
			{glow ? (
				<g>
					<defs>
						<radialGradient id={`${a.uid}g`}>
							<stop offset="0%" stopColor="#ffb347" stopOpacity={0.62} />
							<stop offset="55%" stopColor="#ff7a2f" stopOpacity={0.22} />
							<stop offset="100%" stopColor="#ff5f1f" stopOpacity={0} />
						</radialGradient>
					</defs>
					<circle cx={300} cy={520} r={500 + Math.sin(f / 6) * 14} fill={`url(#${a.uid}g)`} />
				</g>
			) : null}
			<g transform={`translate(300 800) scale(${2 - talk} ${talk}) translate(-300 -800)`}>
				<path d={outer} fill={EMBER} stroke={F_OUT} strokeWidth={10} strokeLinejoin="round" />
				<path d={inner} fill={SAFFRON} />
				<path d="M 196 640 Q 180 560 232 500" stroke="#ffe7a8" strokeWidth={16} strokeLinecap="round" fill="none" opacity={0.85} />
				{/* the scout neckerchief */}
				<path d="M 108 668 Q 300 770 492 668 L 484 716 Q 300 818 116 716 Z" fill="#6c5ce7" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
				<path d="M 286 772 L 256 850 L 300 826 L 344 850 L 314 772 Z" fill="#5a4bd4" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
				<circle cx={300} cy={772} r={22} fill="#8f83ff" stroke={OUT} strokeWidth={8} />
				{/* face */}
				<Eye cx={246} cy={566} spec={spec} look={look} lidColor={SAFFRON} uid={`${a.uid}el`} closed={closed} rx={38} ry={44} pupil={F_INK} />
				<Eye cx={354} cy={566} spec={spec} look={look} lidColor={SAFFRON} uid={`${a.uid}er`} closed={closed} rx={38} ry={44} pupil={F_INK} />
				<g transform={`translate(0 ${spec.by * 0.7})`}>
					<rect x={212} y={496} width={68} height={15} rx={7} fill={F_INK} transform={`rotate(${-spec.bl} 246 503)`} />
					<rect x={320} y={496} width={68} height={15} rx={7} fill={F_INK} transform={`rotate(${spec.br} 354 503)`} />
				</g>
				<Mouth cx={300} cy={636} shape={spec.mouth} m={a.mouth} wide={spec.wide} uid={`${a.uid}m`} k={0.72} ink={F_INK} />
			</g>
			<Hand at={hl} color={SAFFRON} r={36} />
			<Hand at={hr} color={SAFFRON} r={36} finger={hands.finger ? hb(hands.finger, 2) : undefined} />
		</g>
	);
};
