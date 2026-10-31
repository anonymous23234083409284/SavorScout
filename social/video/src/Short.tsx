import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ArrowDown, ArrowRight, PinIcon, WalkIcon} from './icons';
import {MapCard} from './MapCard';
import {ACCENT_GRADIENT, C, DISPLAY, LAYOUT, TEXT} from './theme';
import {timeline, type ShortProps, type Spot, type Timeline} from './types';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const XF = 8; // background crossfade, frames

const gradientText: React.CSSProperties = {
	backgroundImage: ACCENT_GRADIENT,
	WebkitBackgroundClip: 'text',
	backgroundClip: 'text',
	color: 'transparent',
};

// One background clip: fades in over the one before it and drifts slowly.
const BgClip: React.FC<{src: string; len: number; fadeIn: boolean; zoomIn: boolean}> = ({src, len, fadeIn, zoomIn}) => {
	const f = useCurrentFrame();
	const opacity = fadeIn ? interpolate(f, [0, XF], [0, 1], clamp) : 1;
	const z = interpolate(f, [0, len], zoomIn ? [1.04, 1.13] : [1.13, 1.04], clamp);
	return (
		<AbsoluteFill style={{opacity}}>
			<OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`}} />
		</AbsoluteFill>
	);
};

const Background: React.FC<{p: ShortProps; T: Timeline}> = ({p, T}) => {
	const scenes = [
		{from: 0, len: T.hook, clip: p.clips[0]},
		...p.map.spots.map((_, k) => ({from: T.spot(k), len: T.spotLen, clip: p.clips[k + 1] ?? p.clips[0]})),
		{from: T.outro, len: T.total - T.outro, clip: p.clips[0]},
	];
	return (
		<AbsoluteFill>
			{scenes.map((s, i) => {
				const from = i === 0 ? 0 : s.from - XF;
				const len = s.len + (i === 0 ? 0 : XF) + (i === scenes.length - 1 ? 0 : XF);
				return (
					<Sequence key={i} from={from} durationInFrames={len}>
						<BgClip src={s.clip} len={len} fadeIn={i > 0} zoomIn={i % 2 === 0} />
					</Sequence>
				);
			})}
		</AbsoluteFill>
	);
};

const Shade: React.FC<{T: Timeline}> = ({T}) => {
	const f = useCurrentFrame();
	// Lighter during the hook so the food reads; darker once there is text and a map.
	const hookness = interpolate(f, [T.hook - 16, T.hook + 4], [1, 0], clamp);
	return (
		<>
			<AbsoluteFill style={{background: `rgba(12,9,18,${0.5 - 0.16 * hookness})`}} />
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(12,9,18,0.92) 0%, rgba(12,9,18,0.55) 22%, rgba(12,9,18,0) 44%, rgba(12,9,18,0) 70%, rgba(12,9,18,0.75) 100%)'}} />
			<AbsoluteFill style={{opacity: hookness, background: 'radial-gradient(ellipse 85% 42% at 50% 45%, rgba(12,9,18,0.6) 0%, rgba(12,9,18,0) 100%)'}} />
		</>
	);
};

const Brand: React.FC = () => (
	<div style={{position: 'absolute', left: LAYOUT.sideX, top: LAYOUT.brandY, display: 'flex', alignItems: 'center', gap: 12}}>
		<Img src={staticFile('brand/flame.png')} style={{height: 40}} />
		<div style={{fontFamily: TEXT, fontWeight: 700, fontSize: 27, letterSpacing: 4, color: C.ink, opacity: 0.92}}>SAVORSCOUT</div>
	</div>
);

const Hook: React.FC<{p: ShortProps; T: Timeline}> = ({p, T}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const exit = interpolate(f, [T.hook - 14, T.hook], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const pop = (delay: number, damping = 14) => spring({frame: f - delay, fps, config: {damping, stiffness: 170, mass: 0.8}});
	const words = p.hook.line.split(' ');
	const k = pop(1);
	const big = pop(4, 12);
	const sub = pop(22, 20);
	return (
		<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 260, opacity: 1 - exit, transform: `translateY(${-140 * exit}px) scale(${1 - 0.06 * exit})`}}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 10,
					padding: '14px 30px 14px 22px',
					borderRadius: 999,
					background: 'rgba(12,9,18,0.72)',
					border: '2px solid rgba(255,200,87,0.45)',
					transform: `scale(${k})`,
					opacity: k,
					marginBottom: 34,
				}}
			>
				<PinIcon size={40} color={C.saffron} />
				<div style={{fontFamily: TEXT, fontWeight: 700, fontSize: 38, letterSpacing: 5, color: C.ink}}>{p.hook.kicker}</div>
			</div>
			<div
				style={{
					fontFamily: DISPLAY,
					fontWeight: 900,
					fontSize: p.hook.bigSize,
					lineHeight: 0.95,
					letterSpacing: -p.hook.bigSize * 0.025,
					...gradientText,
					filter: 'drop-shadow(0 8px 30px rgba(0,0,0,0.45))',
					transform: `translateY(${(1 - big) * 80}px) scale(${0.85 + 0.15 * big})`,
					opacity: Math.min(1, big * 1.4),
					paddingBottom: 6,
				}}
			>
				{p.hook.big}
			</div>
			<div style={{display: 'flex', gap: p.hook.lineSize * 0.26, marginTop: 6}}>
				{words.map((w, i) => {
					const s = pop(10 + i * 3, 13);
					return (
						<span
							key={i}
							style={{
								fontFamily: DISPLAY,
								fontWeight: 900,
								fontSize: p.hook.lineSize,
								lineHeight: 1.05,
								letterSpacing: -p.hook.lineSize * 0.02,
								color: C.ink,
								textShadow: '0 6px 30px rgba(0,0,0,0.5)',
								display: 'inline-block',
								transform: `translateY(${(1 - s) * 70}px)`,
								opacity: Math.min(1, s * 1.3),
							}}
						>
							{w}
						</span>
					);
				})}
			</div>
			<div
				style={{
					marginTop: 40,
					display: 'flex',
					alignItems: 'center',
					gap: 14,
					fontFamily: TEXT,
					fontWeight: 600,
					fontSize: 44,
					color: C.ink,
					opacity: sub,
					transform: `translateY(${(1 - sub) * 30}px)`,
					textShadow: '0 4px 20px rgba(0,0,0,0.6)',
				}}
			>
				{p.hook.sub}
				<ArrowDown size={44} color={C.saffron} style={{transform: `translateY(${Math.sin(f / 4) * 5}px)`}} />
			</div>
		</AbsoluteFill>
	);
};

const SpotInfo: React.FC<{s: Spot; k: number; n: number; len: number}> = ({s, k, n, len}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const inn = (d: number) => spring({frame: f - d, fps, config: {damping: 17, stiffness: 160, mass: 0.8}});
	const out = interpolate(f, [len - 9, len], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const move = (d: number): React.CSSProperties => {
		const v = inn(d);
		return {opacity: Math.min(1, v * 1.3) * (1 - out), transform: `translateY(${(1 - v) * 70 - out * 60}px)`};
	};
	const chip = (bg: string, fg: string, border?: string): React.CSSProperties => ({
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		height: 74,
		padding: '0 28px',
		borderRadius: 37,
		background: bg,
		color: fg,
		border: border ?? 'none',
		fontFamily: TEXT,
		fontWeight: 700,
		fontSize: 38,
		boxSizing: 'border-box',
	});
	return (
		<div style={{position: 'absolute', left: LAYOUT.sideX, right: LAYOUT.sideX + 20, top: LAYOUT.infoTop}}>
			<div style={{display: 'flex', alignItems: 'center', gap: 22, ...move(0)}}>
				<div style={{width: 96, height: 96, borderRadius: 48, background: ACCENT_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 900, fontSize: 58, color: C.onAccent, boxShadow: '0 10px 30px rgba(255,95,31,0.35)'}}>
					{k + 1}
				</div>
				<div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
					<div style={{fontFamily: TEXT, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: C.saffron}}>{s.category.toUpperCase()}</div>
					<div style={{fontFamily: TEXT, fontWeight: 600, fontSize: 30, color: C.inkSoft}}>
						{k + 1} of {n} closest
					</div>
				</div>
			</div>
			<div style={{marginTop: 20, ...move(3)}}>
				{s.nameLines.map((line, i) => (
					<div key={i} style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: s.nameSize, lineHeight: 1.0, letterSpacing: -s.nameSize * 0.022, color: C.ink, textShadow: '0 6px 30px rgba(0,0,0,0.55)', whiteSpace: 'nowrap'}}>
						{line}
					</div>
				))}
			</div>
			<div style={{display: 'flex', gap: 16, marginTop: 26, ...move(7)}}>
				<div style={chip(ACCENT_GRADIENT, C.onAccent)}>
					<WalkIcon size={40} color={C.onAccent} />
					{s.walk_min} min walk
				</div>
				<div style={chip('rgba(12,9,18,0.55)', C.ink, '2px solid rgba(253,248,242,0.28)')}>{Math.max(0.1, s.walk_mi).toFixed(1)} mi</div>
			</div>
			<div style={{marginTop: 16, fontFamily: TEXT, fontWeight: 600, fontSize: 36, color: C.inkSoft, ...move(10)}}>{s.street}</div>
		</div>
	);
};

const Progress: React.FC<{T: Timeline}> = ({T}) => {
	const f = useCurrentFrame();
	const show = interpolate(f, [T.hook - 8, T.hook + 4], [0, 1], clamp);
	return (
		<div style={{position: 'absolute', left: LAYOUT.sideX, right: LAYOUT.sideX, top: LAYOUT.progressY, display: 'flex', gap: 10, opacity: show}}>
			{Array.from({length: T.n}, (_, k) => {
				const fill = interpolate(f, [T.spot(k), T.spot(k) + T.spotLen], [0, 1], clamp);
				return (
					<div key={k} style={{flex: 1, height: 8, borderRadius: 4, background: 'rgba(253,248,242,0.2)', overflow: 'hidden'}}>
						<div style={{width: `${fill * 100}%`, height: '100%', background: ACCENT_GRADIENT}} />
					</div>
				);
			})}
		</div>
	);
};

const Outro: React.FC<{p: ShortProps}> = ({p}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const inn = (d: number, damping = 16) => spring({frame: f - d, fps, config: {damping, stiffness: 150, mass: 0.85}});
	const a = inn(4, 12);
	const b = inn(10);
	const c = inn(18, 11);
	const d = inn(30);
	const shine = interpolate(f, [34, 58], [-0.4, 1.4], clamp);
	return (
		<div style={{position: 'absolute', left: LAYOUT.sideX, right: LAYOUT.sideX + 20, top: LAYOUT.infoTop - 6}}>
			<div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: p.outro.moreSize, lineHeight: 0.95, letterSpacing: -p.outro.moreSize * 0.03, transform: `translateY(${(1 - a) * 80}px) scale(${0.9 + 0.1 * a})`, transformOrigin: 'left center', opacity: Math.min(1, a * 1.4)}}>
				<span style={gradientText}>{p.outro.more}</span>
			</div>
			<div style={{marginTop: 14, fontFamily: TEXT, fontWeight: 700, fontSize: 44, lineHeight: 1.2, color: C.ink, opacity: b, transform: `translateY(${(1 - b) * 40}px)`, textShadow: '0 4px 20px rgba(0,0,0,0.6)'}}>
				{p.outro.line}
			</div>
			<div
				style={{
					marginTop: 34,
					display: 'inline-flex',
					alignItems: 'center',
					gap: 16,
					height: 112,
					padding: '0 44px 0 30px',
					borderRadius: 56,
					background: ACCENT_GRADIENT,
					position: 'relative',
					overflow: 'hidden',
					transform: `scale(${c})`,
					transformOrigin: 'left center',
					boxShadow: '0 16px 50px rgba(255,95,31,0.45)',
				}}
			>
				<div style={{width: 62, height: 62, borderRadius: 31, background: C.base, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
					<Img src={staticFile('brand/flame.png')} style={{height: 42}} />
				</div>
				<div style={{fontFamily: DISPLAY, fontWeight: 900, fontSize: 56, color: C.onAccent, letterSpacing: -1}}>{p.outro.site}</div>
				<div style={{position: 'absolute', top: 0, bottom: 0, width: 140, left: `${shine * 100}%`, background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)', transform: 'skewX(-18deg)'}} />
			</div>
			<div style={{marginTop: 30, display: 'flex', alignItems: 'center', gap: 12, fontFamily: TEXT, fontWeight: 700, fontSize: 38, color: C.inkSoft, opacity: d, transform: `translateX(${(1 - d) * -30}px)`}}>
				{p.outro.follow}
				<ArrowRight size={40} color={C.saffron} style={{transform: `translateX(${Math.sin(f / 4) * 6}px)`}} />
			</div>
		</div>
	);
};

export const Short: React.FC<ShortProps> = (p) => {
	const T = timeline(p.timing, p.map.spots.length);
	return (
		<AbsoluteFill style={{background: C.base}}>
			<Background p={p} T={T} />
			<Shade T={T} />
			<Sequence durationInFrames={T.hook + 2}>
				<Hook p={p} T={T} />
			</Sequence>
			<MapCard map={p.map} T={T} showCredits={p.credits} />
			{p.map.spots.map((s, k) => (
				<Sequence key={k} from={T.spot(k)} durationInFrames={T.spotLen}>
					<SpotInfo s={s} k={k} n={T.n} len={T.spotLen} />
				</Sequence>
			))}
			<Sequence from={T.outro}>
				<Outro p={p} />
			</Sequence>
			<Progress T={T} />
			<Brand />
			{p.audio ? <Audio src={staticFile(p.audio)} /> : null}
		</AbsoluteFill>
	);
};
