import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CapIcon} from './icons';
import {C, DISPLAY, TEXT} from './theme';

// The creator-style format: full-screen footage cut on the beat, captions in
// the bold outlined style people read on TikTok every day, and nothing that
// looks like an app (no header, no progress bar, no cards). Scenes, timings
// and fitted captions come from social/pipeline/reel.py.

type Word = {t: string; hl?: boolean};
type Fitted = {size: number; lines: Word[][]};
type RankMap = {src: string; width: number; height: number; campus: {x: number; y: number}; radius: number; dots: [number, number][]; hl?: [number, number][]; attribution: string};
export type ReelScene = {
	from: number;
	dur: number;
	style: 'hook' | 'cap' | 'item' | 'word' | 'small' | 'end' | 'list' | 'rank';
	zoom: 'in' | 'out';
	src?: string;
	caption?: Fitted;
	sub?: Fitted;
	list?: {title: string; rows: [string, string, string, string?][]; size?: number};
	rowAt?: number[];
	map?: RankMap;
	rank?: {num: string; name: Fitted; count: number; sub: Fitted; label?: string; suffix?: string; punch?: number[]};
};
export type ReelProps = {scenes: ReelScene[]; audio: string; total: number; bpm: number; site: string; credits: string};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const INK = '#0c0912';

const stroke = (size: number): React.CSSProperties => ({
	WebkitTextStroke: `${Math.max(4, Math.round(size * 0.07))}px ${INK}`,
	paintOrder: 'stroke fill',
	textShadow: `0 ${Math.round(size * 0.06)}px ${Math.round(size * 0.22)}px rgba(0,0,0,0.5)`,
});

// True for the video's first scene. Viewers decide in the first second, so
// everything in it is already on screen at frame 0 instead of popping in.
const Instant = React.createContext(false);

const usePop = (delay: number, damping = 13) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const instant = React.useContext(Instant);
	const s = spring({frame: f - delay, fps, config: {damping, stiffness: 230, mass: 0.6}});
	return instant ? 1 : s;
};

// Outlined caption lines; words pop in one after another.
const Lines: React.FC<{cap: Fitted; delay?: number; color?: string}> = ({cap, delay = 0, color = '#fff'}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const instant = React.useContext(Instant);
	let k = 0;
	return (
		<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cap.size * 0.02}}>
			{cap.lines.map((line, li) => (
				<div key={li} style={{display: 'flex', gap: cap.size * 0.24, whiteSpace: 'nowrap'}}>
					{line.map((w, wi) => {
						const s = instant ? 1 : spring({frame: f - delay - k++ * 1.6, fps, config: {damping: 13, stiffness: 230, mass: 0.6}});
						return (
							<span
								key={wi}
								style={{
									fontFamily: DISPLAY,
									fontWeight: 900,
									fontSize: cap.size,
									lineHeight: 1.06,
									letterSpacing: -cap.size * 0.02,
									color: w.hl ? C.saffron : color,
									display: 'inline-block',
									transform: `translateY(${(1 - s) * cap.size * 0.3}px) scale(${0.72 + 0.28 * s})`,
									opacity: Math.min(1, s * 1.7),
									...stroke(cap.size),
								}}
							>
								{w.t}
							</span>
						);
					})}
				</div>
			))}
		</div>
	);
};

// The white subtitle box creators use for the smaller line.
const Box: React.FC<{cap: Fitted; delay?: number}> = ({cap, delay = 0}) => {
	const s = usePop(delay, 15);
	return (
		<div
			style={{
				marginTop: 34,
				background: '#fff',
				borderRadius: 20,
				padding: '16px 28px 18px',
				maxWidth: 900,
				textAlign: 'center',
				fontFamily: TEXT,
				fontWeight: 600,
				fontSize: cap.size,
				lineHeight: 1.28,
				color: INK,
				transform: `scale(${0.8 + 0.2 * s})`,
				opacity: Math.min(1, s * 1.6),
				boxShadow: '0 12px 34px rgba(0,0,0,0.4)',
			}}
		>
			{cap.lines.map((l, i) => (
				<div key={i}>
					{l.map((w, j) => (
						<span key={j} style={{color: w.hl ? C.ember : INK}}>
							{w.t}
							{j < l.length - 1 ? ' ' : ''}
						</span>
					))}
				</div>
			))}
		</div>
	);
};

const Bg: React.FC<{src: string; dur: number; zoom: 'in' | 'out'; blur?: boolean}> = ({src, dur, zoom, blur}) => {
	const f = useCurrentFrame();
	const punch = interpolate(f, [0, 7], [1.07, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const drift = zoom === 'in' ? interpolate(f, [0, dur], [1.0, 1.09], clamp) : interpolate(f, [0, dur], [1.09, 1.0], clamp);
	return (
		<AbsoluteFill>
			<OffthreadVideo
				src={staticFile(src)}
				muted
				style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${drift * punch * (blur ? 1.15 : 1)})`, filter: blur ? 'blur(22px) brightness(0.42) saturate(1.15)' : undefined}}
			/>
		</AbsoluteFill>
	);
};

const Shade: React.FC<{strength?: number}> = ({strength = 1}) => (
	<>
		<AbsoluteFill style={{background: `rgba(12,9,18,${0.16 * strength})`}} />
		<AbsoluteFill style={{background: `radial-gradient(ellipse 90% 60% at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,${0.45 * strength}) 100%)`}} />
	</>
);

const ClipScene: React.FC<{s: ReelScene; first: boolean}> = ({s, first}) => {
	const f = useCurrentFrame();
	const flash = first ? 0 : interpolate(f, [0, 4], [0.22, 0], clamp);
	const center: React.CSSProperties = {alignItems: 'center', justifyContent: 'center', padding: '0 70px'};
	return (
		<AbsoluteFill>
			<Bg src={s.src!} dur={s.dur} zoom={s.zoom} />
			<Shade strength={s.style === 'word' ? 0.7 : 1} />
			{s.style === 'hook' && s.caption ? (
				<AbsoluteFill style={{...center, paddingBottom: 300}}>
					<Lines cap={s.caption} />
					{s.sub ? <Box cap={s.sub} delay={8} /> : null}
				</AbsoluteFill>
			) : null}
			{(s.style === 'cap' || s.style === 'item') && s.caption ? (
				<AbsoluteFill style={{...center, paddingBottom: 140}}>
					<Lines cap={s.caption} delay={1} />
					{s.sub ? <Box cap={s.sub} delay={7} /> : null}
				</AbsoluteFill>
			) : null}
			{s.style === 'word' && s.caption ? (
				<AbsoluteFill style={{...center, paddingBottom: 120}}>
					<Lines cap={s.caption} />
				</AbsoluteFill>
			) : null}
			{s.style === 'small' && s.caption ? (
				<AbsoluteFill style={{...center, paddingTop: 260}}>
					<Box cap={s.caption} delay={2} />
				</AbsoluteFill>
			) : null}
			<AbsoluteFill style={{background: '#fff', opacity: flash}} />
		</AbsoluteFill>
	);
};

const ListScene: React.FC<{s: ReelScene}> = ({s}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const title = usePop(0, 15);
	const rows = s.list!.rows;
	const fs = s.list!.size ?? 64; // fitted by reel.py so the longest name fits beside its number
	return (
		<AbsoluteFill>
			<Bg src={s.src!} dur={s.dur} zoom={s.zoom} blur />
			<div style={{position: 'absolute', left: 70, right: 150, top: 330}}>
				<div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 64, color: C.saffron, letterSpacing: -1, textWrap: 'balance', opacity: title, transform: `translateY(${(1 - title) * 30}px)`, ...stroke(64)}}>
					{s.list!.title}
				</div>
				<div style={{marginTop: 34, display: 'flex', flexDirection: 'column', gap: 18}}>
					{rows.map(([rank, name, value, sub], r) => {
						const p = spring({frame: f - s.rowAt![r], fps, config: {damping: 16, stiffness: 210, mass: 0.6}});
						return (
							<div key={r} style={{display: 'flex', alignItems: 'baseline', gap: 26, opacity: Math.min(1, p * 1.6), transform: `translateX(${(1 - p) * 90}px)`}}>
								<div style={{width: 70, textAlign: 'right', fontFamily: DISPLAY, fontWeight: 900, fontSize: fs * 0.94, color: C.saffron, ...stroke(fs)}}>{rank}</div>
								<div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
									<div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: fs, color: '#fff', letterSpacing: -1, whiteSpace: 'nowrap', ...stroke(fs)}}>{name}</div>
									{sub ? <div style={{marginTop: 2, fontFamily: TEXT, fontWeight: 700, fontSize: Math.round(fs * 0.56), color: C.saffron, whiteSpace: 'nowrap', textShadow: '0 2px 10px rgba(0,0,0,0.85)'}}>{sub}</div> : null}
								</div>
								<div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: fs, color: '#fff', ...stroke(fs)}}>{value}</div>
							</div>
						);
					})}
				</div>
			</div>
		</AbsoluteFill>
	);
};

const RankScene: React.FC<{s: ReelScene}> = ({s}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const m = s.map!;
	const r = s.rank!;
	const base = Math.max(345 / m.radius, 1080 / m.width, 1920 / m.height);
	// Punch-ins: an instant zoom step at set points (fractions of the scene), read as a cut while
	// the count and the name stay on screen. The lab sets them to match the pacing that works.
	const punches = (r.punch ?? []).map((p) => Math.round(p * s.dur)).filter((p) => p > 0 && p < s.dur);
	const stepped = punches.filter((p) => f >= p).length % 2 === 1 ? 1.13 : 1.0;
	const z = base * interpolate(f, [0, s.dur], [1.0, 1.06], clamp) * stepped;
	const cx = 540;
	const cy = 985;
	const tx = Math.min(0, Math.max(1080 - m.width * z, cx - m.campus.x * z));
	const ty = Math.min(0, Math.max(1920 - m.height * z, cy - m.campus.y * z));
	const px = (x: number) => tx + x * z;
	const py = (y: number) => ty + y * z;
	// With a highlighted street, every place appears first, dimmed; then the street's places light up end to end.
	const hl = m.hl ?? [];
	const lit = hl.length > 0;
	const grow = Easing.out(Easing.cubic)(interpolate(f, [8, 8 + s.dur * (lit ? 0.28 : 0.55)], [0, 1], clamp));
	const glow = Easing.inOut(Easing.cubic)(interpolate(f, [s.dur * 0.3, s.dur * 0.72], [0, 1], clamp));
	const shown = Math.round(m.dots.length * grow);
	const shownHl = Math.round(hl.length * glow);
	const count = Math.round(r.count * (lit ? glow : grow));
	const ring = interpolate(f, [2, 16], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const R = m.radius * z;
	const top = usePop(0, 14);
	const name = usePop(4, 14);
	const sub = usePop(12, 15);
	const pulse = (f % 24) / 24;
	return (
		<AbsoluteFill style={{background: C.base}}>
			<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>
				<Img src={staticFile(m.src)} style={{width: m.width, height: m.height}} />
			</div>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(12,9,18,0.85) 0%, rgba(12,9,18,0.2) 30%, rgba(12,9,18,0) 50%, rgba(12,9,18,0.25) 70%, rgba(12,9,18,0.85) 100%)'}} />
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
				<circle cx={px(m.campus.x)} cy={py(m.campus.y)} r={R} fill="rgba(255,95,31,0.08)" stroke={C.saffron} strokeWidth={5} strokeDasharray={`${2 * Math.PI * R}`} strokeDashoffset={2 * Math.PI * R * (1 - ring)} transform={`rotate(-90 ${px(m.campus.x)} ${py(m.campus.y)})`} />
				{m.dots.slice(0, shown).map(([x, y], i) => {
					const age = Math.min(1, (shown - i) / 6);
					return lit ? (
						<circle key={i} cx={px(x)} cy={py(y)} r={5 + 2 * (1 - age)} fill="#8f84b3" opacity={0.55 + 0.3 * (1 - glow)} stroke={INK} strokeWidth={1} />
					) : (
						<g key={i}>
							<circle cx={px(x)} cy={py(y)} r={13} fill={C.ember} opacity={0.22 * age} />
							<circle cx={px(x)} cy={py(y)} r={6 + 3 * (1 - age)} fill={i % 3 === 0 ? C.saffron : C.ember} stroke={INK} strokeWidth={1.5} />
						</g>
					);
				})}
				{hl.slice(0, shownHl).map(([x, y], i) => {
					const age = Math.min(1, (shownHl - i) / 5);
					return (
						<g key={`h${i}`}>
							<circle cx={px(x)} cy={py(y)} r={18} fill={C.saffron} opacity={0.28 * age} />
							<circle cx={px(x)} cy={py(y)} r={7 + 4 * (1 - age)} fill={C.saffron} stroke={INK} strokeWidth={1.5} />
						</g>
					);
				})}
			</svg>
			<div style={{position: 'absolute', left: px(m.campus.x) - 34, top: py(m.campus.y) - 34, width: 68, height: 68, borderRadius: 34, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 ${8 + pulse * 22}px rgba(253,248,242,${0.25 * (1 - pulse)}), 0 10px 30px rgba(0,0,0,0.6)`}}>
				<CapIcon size={40} color={C.base} />
			</div>
			<div style={{position: 'absolute', left: 60, right: 150, top: 200, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
				{r.num ? <div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 150, lineHeight: 1, color: C.saffron, transform: `scale(${0.6 + 0.4 * top})`, opacity: top, ...stroke(150)}}>#{r.num}</div> : null}
				<div style={{marginTop: 8, opacity: name, transform: `translateY(${(1 - name) * 30}px)`}}>
					<Lines cap={r.name} delay={4} />
				</div>
				<div style={{opacity: sub}}>
					<Box cap={r.sub} delay={12} />
				</div>
			</div>
			<div style={{position: 'absolute', left: 60, right: 150, top: 1395, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
				<div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 132, lineHeight: 1, color: lit ? C.saffron : '#fff', ...stroke(132)}}>{count.toLocaleString('en-US')}{r.suffix ?? ''}</div>
				<div style={{marginTop: 6, fontFamily: TEXT, fontWeight: 700, fontSize: 38, color: '#fff', textAlign: 'center', textWrap: 'balance', textShadow: '0 3px 14px rgba(0,0,0,0.8)'}}>{r.label ?? 'places to eat within ½ mile'}</div>
			</div>
			<div style={{position: 'absolute', left: 40, top: 1885, fontFamily: TEXT, fontWeight: 600, fontSize: 18, color: C.inkMid}}>{m.attribution}</div>
		</AbsoluteFill>
	);
};

const EndScene: React.FC<{s: ReelScene; site: string; credits: string}> = ({s, site, credits}) => {
	const brand = usePop(10, 15);
	return (
		<AbsoluteFill>
			<Bg src={s.src!} dur={s.dur} zoom={s.zoom} blur />
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 70px', paddingBottom: 220}}>
				{s.caption ? <Lines cap={s.caption} /> : null}
				{s.sub ? <div style={{marginTop: 30, fontFamily: TEXT, fontWeight: 700, fontSize: s.sub.size, color: C.inkSoft, textAlign: 'center', textShadow: '0 3px 14px rgba(0,0,0,0.6)'}}>{s.sub.lines.map((l) => l.map((w) => w.t).join(' ')).join(' ')}</div> : null}
				<div style={{marginTop: 70, display: 'flex', alignItems: 'center', gap: 18, opacity: brand, transform: `translateY(${(1 - brand) * 24}px)`}}>
					<Img src={staticFile('brand/flame.png')} style={{height: 64}} />
					<div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 56, color: '#fff', letterSpacing: -1, ...stroke(56)}}>{site}</div>
				</div>
			</AbsoluteFill>
			<div style={{position: 'absolute', left: 40, top: 1885, fontFamily: TEXT, fontWeight: 600, fontSize: 18, color: C.inkMid}}>{credits}</div>
		</AbsoluteFill>
	);
};

// A hook over a campus map: every place to eat already on it, the title on top.
// Original footage, unlike stock clips that thousands of other videos use.
const MapHook: React.FC<{s: ReelScene}> = ({s}) => {
	const f = useCurrentFrame();
	const m = s.map!;
	const base = Math.max(345 / m.radius, 1080 / m.width, 1920 / m.height);
	const z = base * interpolate(f, [0, s.dur], [1.03, 1.12], clamp);
	const tx = Math.min(0, Math.max(1080 - m.width * z, 540 - m.campus.x * z));
	const ty = Math.min(0, Math.max(1920 - m.height * z, 985 - m.campus.y * z));
	const px = (x: number) => tx + x * z;
	const py = (y: number) => ty + y * z;
	const lit = (m.hl ?? []).length > 0;
	const dots = [...m.dots, ...(m.hl ?? [])];
	// A third of the places are on screen at frame 0; the rest pop in while the title is read.
	const shown = Math.round(dots.length * interpolate(f, [0, s.dur * 0.6], [0.35, 1], {...clamp, easing: Easing.out(Easing.quad)}));
	return (
		<AbsoluteFill style={{background: C.base}}>
			<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})`}}>
				<Img src={staticFile(m.src)} style={{width: m.width, height: m.height}} />
			</div>
			<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
				{dots.slice(0, shown).map(([x, y], i) => {
					const age = Math.min(1, (shown - i) / 8);
					return (
						<circle key={i} cx={px(x)} cy={py(y)} r={(lit ? 5 : 7) + 4 * (1 - age)} fill={lit ? '#8f84b3' : i % 3 === 0 ? C.saffron : C.ember} opacity={lit ? 0.8 : 0.95} stroke={INK} strokeWidth={1.2} />
					);
				})}
			</svg>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(12,9,18,0.82) 0%, rgba(12,9,18,0.5) 45%, rgba(12,9,18,0.6) 100%)'}} />
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 70px', paddingBottom: 260}}>
				{s.caption ? <Lines cap={s.caption} /> : null}
				{s.sub ? <Box cap={s.sub} delay={8} /> : null}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

export const Reel: React.FC<ReelProps> = ({scenes, audio, site, credits}) => (
	<AbsoluteFill style={{background: C.base}}>
		{scenes.map((s, i) => (
			<Sequence key={i} from={s.from} durationInFrames={s.dur}>
				<Instant.Provider value={i === 0}>
					{s.style === 'list' ? (
						<ListScene s={s} />
					) : s.style === 'rank' ? (
						<RankScene s={s} />
					) : s.style === 'end' ? (
						<EndScene s={s} site={site} credits={credits} />
					) : s.style === 'hook' && s.map ? (
						<MapHook s={s} />
					) : (
						<ClipScene s={s} first={i === 0} />
					)}
				</Instant.Provider>
			</Sequence>
		))}
		<Audio src={staticFile(audio)} />
	</AbsoluteFill>
);
