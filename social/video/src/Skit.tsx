import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, CAPTION, ROUND} from './theme';
import {Milo, Scout, OUT, type Face, type Look, type Pose} from './skit/Cast';
import {BalanceProp, PlanProp, SetBack, SetFront, type SetName} from './skit/Stage';

// The show: short comedy scenes with SavorScout's own cast (social/show/BIBLE.md). An episode is a
// list of shots; social/pipeline/show.py writes it from a script, with each line's voice, its
// timing, the captions and the mouth movement. The grammar is the one live-action skits use:
//   solo   - one character, close, talking or reacting (cut back and forth for a conversation)
//   two    - both in the room (entrances, hand-offs)
//   insert - a close-up of a prop: the visual gag
//   map    - the real map of the campus with every place to eat, and the number
//   end    - the name of the site

export type Cap = {a: number; b: number; w: {t: string; hl?: boolean}[]};
type RankMap = {src: string; width: number; height: number; campus: {x: number; y: number}; radius: number; dots: [number, number][]; attribution: string};
export type Prop =
	| {kind: 'balance'; amount: string; rows: [string, string][]}
	| {kind: 'plan'; title: string; lines: string[]; burnAt?: number; burnFor?: number};
export type Shot = {
	from: number;
	dur: number;
	kind: 'solo' | 'two' | 'insert' | 'map' | 'end';
	set?: SetName;
	who?: 'milo' | 'scout';
	face?: Face;
	pose?: Pose;
	look?: Look;
	other?: {face: Face; pose: Pose; look: Look};
	mouth?: number[];
	caps?: Cap[];
	fx?: string[];
	punchAt?: number;
	enterAt?: number;
	scan?: boolean;
	prop?: Prop;
	map?: RankMap & {count: number; label: string; place: string};
	title?: string;
	chip?: boolean;
};
export type SkitProps = {shots: Shot[]; audio: string; total: number; site: string; credits: string; tagline?: string};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const INK = '#150c26';

const stroke = (size: number): React.CSSProperties => ({
	WebkitTextStroke: `${Math.max(8, Math.round(size * 0.13))}px ${INK}`,
	paintOrder: 'stroke fill',
	textShadow: `0 ${Math.round(size * 0.07)}px 0 ${INK}, 0 ${Math.round(size * 0.14)}px ${Math.round(size * 0.2)}px rgba(0,0,0,0.45)`,
});

// Spoken captions: a few words at a time, popping in as they're said, one word in colour.
const Captions: React.FC<{caps: Cap[]; y?: number}> = ({caps, y = 1236}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const i = caps.findIndex((c) => f >= c.a && f < c.b);
	if (i < 0) {
		return null;
	}
	const cap = caps[i];
	const chars = cap.w.reduce((n, w) => n + w.t.length, 0) + cap.w.length - 1;
	const size = chars <= 9 ? 132 : chars <= 14 ? 112 : chars <= 19 ? 92 : 78;
	const s = spring({frame: f - cap.a, fps, config: {damping: 12, stiffness: 320, mass: 0.5}});
	return (
		<div style={{position: 'absolute', left: 40, right: 140, top: y, display: 'flex', justifyContent: 'center'}}>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					columnGap: size * 0.26,
					rowGap: 0,
					maxWidth: 860,
					transform: `scale(${0.78 + 0.22 * s}) rotate(${(i % 2 ? 1 : -1) * 1.6}deg)`,
				}}
			>
				{cap.w.map((w, k) => (
					<span key={k} style={{fontFamily: CAPTION, fontSize: size, lineHeight: 1.08, color: w.hl ? C.saffron : '#fff', textTransform: 'uppercase', letterSpacing: size * 0.01, ...stroke(size)}}>
						{w.t}
					</span>
				))}
			</div>
		</div>
	);
};

const TitleChip: React.FC<{text: string; dur: number}> = ({text, dur}) => {
	const f = useCurrentFrame();
	const out = interpolate(f, [dur - 8, dur], [1, 0], clamp);
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 196, display: 'flex', justifyContent: 'center', opacity: out}}>
			<div style={{background: '#fff', color: INK, fontFamily: ROUND, fontWeight: 700, fontSize: 50, padding: '14px 34px 16px', borderRadius: 22, border: `7px solid ${INK}`, boxShadow: `0 10px 0 ${INK}`, transform: 'rotate(-2deg)'}}>
				{text}
			</div>
		</div>
	);
};

const BrandChip: React.FC<{site: string}> = ({site}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const s = spring({frame: f - 4, fps, config: {damping: 11, stiffness: 200, mass: 0.6}});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, top: 190, display: 'flex', justifyContent: 'center', transform: `scale(${0.6 + 0.4 * s})`, opacity: Math.min(1, s * 1.5)}}>
			<div style={{display: 'flex', alignItems: 'center', gap: 16, background: C.base, padding: '14px 34px 14px 24px', borderRadius: 60, border: `6px solid ${C.saffron}`}}>
				<Img src={staticFile('brand/flame.png')} style={{height: 58}} />
				<div style={{fontFamily: CAPTION, fontSize: 60, color: '#fff'}}>{site}</div>
			</div>
		</div>
	);
};

const acting = (face: Face, pose: Pose, look: Look, mouth: number, f: number, uid: string) => ({face, pose, look, mouth, f, uid});

// Where a character stands, by shot. Milo sits a little left and looks right; Scout floats a little
// right and looks left, so cutting between them reads as two people facing each other.
const PLACE = {
	solo: {milo: 'translate(-56 250) scale(1.72)', scout: 'translate(170 130) scale(1.4)'},
	two: {milo: 'translate(-70 520) scale(1.12)', scout: 'translate(500 330) scale(0.98)'},
};

const Stage: React.FC<{s: Shot; uid: string}> = ({s, uid}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const set = s.set ?? 'dorm';
	const fx = s.fx ?? [];
	const m = s.mouth ? (s.mouth[Math.min(s.mouth.length - 1, f)] ?? 0) : 0;
	const push = interpolate(f, [0, s.dur], [1.0, 1.05], clamp);
	const punch = s.punchAt !== undefined && f >= s.punchAt ? 1.17 : 1;
	const z = push * punch;
	const decay = Math.max(0, 1 - f / 16);
	const sx = fx.includes('shake') ? Math.sin(f * 4.7) * 16 * decay : 0;
	const sy = fx.includes('shake') ? Math.cos(f * 6.1) * 12 * decay : 0;
	const cut = fx.includes('cold') ? 1 : interpolate(f, [0, 4], [1.035, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const who = s.who ?? 'milo';
	const face = s.face ?? 'neutral';
	const pose = s.pose ?? 'idle';
	// Reading: the eyes move left and right across the page.
	const look: Look = s.scan ? (Math.floor(f / 9) % 2 ? 'left' : 'down') : (s.look ?? (who === 'milo' ? 'right' : 'left'));
	const enter = s.enterAt !== undefined ? spring({frame: f - s.enterAt, fps, config: {damping: 12, stiffness: 150, mass: 0.7}}) : 1;
	const other = s.other ?? {face: 'neutral' as Face, pose: 'idle' as Pose, look: 'cam' as Look};
	const burn = s.prop && s.prop.kind === 'plan' && s.prop.burnAt !== undefined ? Math.max(0, (f - s.prop.burnAt) / (s.prop.burnFor ?? 26)) : 0;
	const hold = s.prop && s.prop.kind === 'plan' ? spring({frame: f, fps, config: {damping: 14, stiffness: 160, mass: 0.6}}) : 1;
	return (
		<AbsoluteFill style={{background: '#4636a6'}}>
			<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0}}>
				<g transform={`translate(${540 + sx} ${820 + sy}) scale(${z * cut}) translate(-540 -820)`}>
					<SetBack set={s.kind === 'insert' ? 'spot' : set} f={f} uid={uid} />
					{s.kind === 'solo' && who === 'milo' ? (
						<g transform={PLACE.solo.milo}>
							<Milo a={acting(face, pose, look, m, f, `${uid}a`)} />
						</g>
					) : null}
					{s.kind === 'solo' && who === 'scout' ? (
						<g transform={s.prop ? 'translate(330 60) scale(1.3)' : PLACE.solo.scout}>
							<Scout a={acting(face, s.prop ? 'paper' : pose, look, m, f, `${uid}a`)} />
						</g>
					) : null}
					{s.kind === 'two' ? (
						<g>
							<g transform={PLACE.two.milo}>
								<Milo a={who === 'milo' ? acting(face, pose, look, m, f, `${uid}a`) : acting(other.face, other.pose, other.look, 0, f, `${uid}a`)} />
							</g>
							<g transform={`translate(${(1 - enter) * 700} ${(1 - enter) * -120})`}>
								<g transform={PLACE.two.scout}>
									<Scout a={who === 'scout' ? acting(face, pose, look, m, f, `${uid}b`) : acting(other.face, other.pose, other.look, 0, f, `${uid}b`)} />
								</g>
							</g>
							{s.enterAt !== undefined && f >= s.enterAt && f < s.enterAt + 16
								? Array.from({length: 9}).map((_, i) => {
										const t = (f - s.enterAt!) / 16;
										const ang = (i / 9) * Math.PI * 2;
										return <path key={i} d="M 0 -26 L 7 -7 L 26 0 L 7 7 L 0 26 L -7 7 L -26 0 L -7 -7 Z" fill="#fff3c4" stroke={OUT} strokeWidth={4} transform={`translate(${800 + Math.cos(ang) * 330 * t} ${800 + Math.sin(ang) * 330 * t}) scale(${1.4 * (1 - t)})`} />;
									})
								: null}
						</g>
					) : null}
					{s.kind !== 'insert' ? <SetFront set={set} /> : null}
					{s.kind === 'insert' && s.prop?.kind === 'balance' ? (
						<g transform={`translate(540 900) scale(${0.7 + 0.3 * spring({frame: f, fps, config: {damping: 11, stiffness: 190, mass: 0.6}})}) rotate(${-5 + Math.sin(f / 13) * 1.2}) translate(-540 -900)`}>
							<BalanceProp amount={s.prop.amount} rows={s.prop.rows} f={f} />
						</g>
					) : null}
					{s.kind === 'insert' && s.prop?.kind === 'plan' ? <PlanProp title={s.prop.title} lines={s.prop.lines} burn={burn} f={f} uid={uid} /> : null}
					{s.kind === 'solo' && s.prop?.kind === 'plan' ? (
						<g transform={`translate(0 ${(1 - hold) * 500})`}>
							<PlanProp title={s.prop.title} lines={s.prop.lines} burn={burn} f={f} uid={uid} x={36} y={830} s={0.86} tilt={-7} />
						</g>
					) : null}
				</g>
			</svg>
			{s.title ? <TitleChip text={s.title} dur={s.dur} /> : null}
			{s.caps ? <Captions caps={s.caps} y={s.kind === 'insert' ? 1380 : s.kind === 'two' ? 1190 : 1236} /> : null}
		</AbsoluteFill>
	);
};

// The real thing Scout knows: the campus map, every place to eat, and the count.
const MapShot: React.FC<{s: Shot; uid: string}> = ({s, uid}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const m = s.map!;
	const base = Math.max(400 / m.radius, 1080 / m.width, 1920 / m.height);
	const z = base * interpolate(f, [0, s.dur], [1.0, 1.08], clamp);
	const tx = Math.min(0, Math.max(1080 - m.width * z, 540 - m.campus.x * z));
	const ty = Math.min(0, Math.max(1920 - m.height * z, 760 - m.campus.y * z));
	const px = (x: number) => tx + x * z;
	const py = (y: number) => ty + y * z;
	const grow = Easing.out(Easing.cubic)(interpolate(f, [4, Math.min(s.dur - 12, 54)], [0, 1], clamp));
	const shown = Math.round(m.dots.length * grow);
	const count = Math.round(m.count * grow);
	const R = m.radius * z;
	const pop = spring({frame: f, fps, config: {damping: 12, stiffness: 180, mass: 0.6}});
	const mouth = s.mouth ? (s.mouth[Math.min(s.mouth.length - 1, f)] ?? 0) : 0;
	return (
		<AbsoluteFill style={{background: C.base}}>
			<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>
				<Img src={staticFile(m.src)} style={{width: m.width, height: m.height}} />
			</div>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(12,9,18,0.8) 0%, rgba(12,9,18,0.05) 26%, rgba(12,9,18,0) 50%, rgba(12,9,18,0.5) 66%, rgba(12,9,18,0.94) 100%)'}} />
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
				<circle cx={px(m.campus.x)} cy={py(m.campus.y)} r={R} fill="rgba(255,95,31,0.08)" stroke={C.saffron} strokeWidth={6} />
				{m.dots.slice(0, shown).map(([x, y], i) => {
					const age = Math.min(1, (shown - i) / 6);
					return (
						<g key={i}>
							<circle cx={px(x)} cy={py(y)} r={15} fill={C.ember} opacity={0.22 * age} />
							<circle cx={px(x)} cy={py(y)} r={7 + 4 * (1 - age)} fill={i % 3 === 0 ? C.saffron : C.ember} stroke={INK} strokeWidth={1.5} />
						</g>
					);
				})}
				<circle cx={px(m.campus.x)} cy={py(m.campus.y)} r={20} fill="#fff" stroke={INK} strokeWidth={7} />
			</svg>
			<div style={{position: 'absolute', left: 0, right: 0, top: 200, display: 'flex', justifyContent: 'center', transform: `scale(${0.7 + 0.3 * pop})`}}>
				<div style={{background: '#fff', color: INK, fontFamily: ROUND, fontWeight: 700, fontSize: 52, padding: '12px 34px 14px', borderRadius: 22, border: `7px solid ${INK}`, boxShadow: `0 10px 0 ${INK}`}}>{m.place}</div>
			</div>
			<div style={{position: 'absolute', left: 330, right: 40, top: 1180, textAlign: 'center'}}>
				<div style={{fontFamily: CAPTION, fontSize: 250, lineHeight: 0.95, color: C.saffron, ...stroke(250)}}>{count.toLocaleString('en-US')}</div>
				<div style={{fontFamily: CAPTION, fontSize: 62, lineHeight: 1.1, color: '#fff', marginTop: 10, textTransform: 'uppercase', ...stroke(62)}}>{m.label}</div>
			</div>
			{/* Scout in the corner, still talking */}
			<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0}}>
				<g transform={`translate(${-40 - (1 - pop) * 300} 1010) scale(0.62)`}>
					<Scout a={acting(s.face ?? 'smug', 'present', 'right', mouth, f, `${uid}pip`)} />
				</g>
			</svg>
			<div style={{position: 'absolute', left: 40, top: 1885, fontFamily: ROUND, fontWeight: 600, fontSize: 18, color: C.inkMid}}>{m.attribution}</div>
		</AbsoluteFill>
	);
};

const EndShot: React.FC<{site: string; tagline: string; credits: string}> = ({site, tagline, credits}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const a = spring({frame: f, fps, config: {damping: 10, stiffness: 170, mass: 0.7}});
	const b = spring({frame: f - 6, fps, config: {damping: 12, stiffness: 190, mass: 0.6}});
	return (
		<AbsoluteFill style={{background: `radial-gradient(circle at 50% 42%, #3a2a7e 0%, ${C.base} 70%)`, alignItems: 'center', justifyContent: 'center', paddingBottom: 240}}>
			<Img src={staticFile('brand/flame.png')} style={{height: 300, transform: `scale(${a}) rotate(${(1 - a) * -20}deg)`}} />
			<div style={{fontFamily: CAPTION, fontSize: 124, color: '#fff', marginTop: 30, transform: `scale(${0.6 + 0.4 * b})`, opacity: Math.min(1, b * 1.6), ...stroke(124)}}>{site}</div>
			<div style={{fontFamily: ROUND, fontWeight: 700, fontSize: 52, color: C.saffron, marginTop: 22, opacity: Math.min(1, b * 1.6)}}>{tagline}</div>
			<div style={{position: 'absolute', left: 40, top: 1885, fontFamily: ROUND, fontWeight: 600, fontSize: 18, color: C.inkMid}}>{credits}</div>
		</AbsoluteFill>
	);
};

export const Skit: React.FC<SkitProps> = ({shots, audio, site, credits, tagline}) => (
	<AbsoluteFill style={{background: C.base}}>
		{shots.map((s, i) => (
			<Sequence key={i} from={s.from} durationInFrames={s.dur}>
				{s.kind === 'map' ? <MapShot s={s} uid={`k${i}`} /> : s.kind === 'end' ? <EndShot site={site} tagline={tagline ?? 'every place to eat near your campus'} credits={credits} /> : <Stage s={s} uid={`k${i}`} />}
				{s.chip ? <BrandChip site={site} /> : null}
			</Sequence>
		))}
		{audio ? <Audio src={staticFile(audio)} /> : null}
	</AbsoluteFill>
);
