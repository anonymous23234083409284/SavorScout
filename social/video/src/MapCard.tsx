import React, {useMemo} from 'react';
import {Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CapIcon} from './icons';
import {C, DISPLAY, LAYOUT, TEXT} from './theme';
import type {MapData, Pt, Timeline} from './types';

type View = {cx: number; cy: number; s: number};

const card = LAYOUT.card;
const safe = LAYOUT.safe;
const SAFE_W = card.width - safe.left - safe.right;
const SAFE_H = card.height - safe.top - safe.bottom;
const SAFE_CX = safe.left + SAFE_W / 2;
const SAFE_CY = safe.top + SAFE_H / 2;

const MOVE = 24; // frames for the camera to travel between framings
const DRAW_DELAY = 8;
const DRAW_LEN = 30;
export const POP_AT = DRAW_DELAY + DRAW_LEN - 2; // frame (in a spot) the pin lands

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// The framing that fits these points into the safe part of the card, never
// tighter than `minMeters` across so a two-minute walk still shows the blocks around it.
function fit(points: Pt[], map: MapData, minMeters: number): View {
	const xs = points.map((p) => p[0]);
	const ys = points.map((p) => p[1]);
	const minx = Math.min(...xs);
	const maxx = Math.max(...xs);
	const miny = Math.min(...ys);
	const maxy = Math.max(...ys);
	const minPx = minMeters * map.scale;
	const bw = Math.max(maxx - minx, minPx) * 1.22;
	const bh = Math.max(maxy - miny, (minPx * SAFE_H) / SAFE_W) * 1.22;
	return {cx: (minx + maxx) / 2, cy: (miny + maxy) / 2, s: Math.min(SAFE_W / bw, SAFE_H / bh)};
}

const lerpView = (a: View, b: View, t: number): View => ({
	cx: a.cx + (b.cx - a.cx) * t,
	cy: a.cy + (b.cy - a.cy) * t,
	s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t),
});

function polyLength(pts: Pt[]) {
	let L = 0;
	for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
	return L;
}

function pointAt(pts: Pt[], dist: number): Pt {
	let acc = 0;
	for (let i = 1; i < pts.length; i++) {
		const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
		if (acc + seg >= dist && seg > 0) {
			const t = (dist - acc) / seg;
			return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
		}
		acc += seg;
	}
	return pts[pts.length - 1];
}

const pathD = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

export const MapCard: React.FC<{map: MapData; T: Timeline; showCredits: string}> = ({map, T, showCredits}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const campus: Pt = [map.campus.x, map.campus.y];

	const views = useMemo(() => {
		const all: Pt[] = [campus, ...map.spots.flatMap((s) => s.route)];
		return {
			overview: fit(all, map, 650),
			spot: map.spots.map((s) => fit([campus, ...s.route], map, 430)),
		};
	}, [map]);
	const lengths = useMemo(() => map.spots.map((s) => polyLength(s.route)), [map]);
	// Put the campus name on the side away from the nearest spot, which is the
	// pin most likely to sit right next to it.
	const labelLeft = useMemo(() => {
		const near = [...map.spots].sort((a, b) => Math.hypot(a.x - map.campus.x, a.y - map.campus.y) - Math.hypot(b.x - map.campus.x, b.y - map.campus.y))[0];
		return near ? near.x > map.campus.x : false;
	}, [map]);

	// Which spot is on screen, and how far into it we are.
	const enterAt = T.hook - 14;
	const inOutro = frame >= T.outro;
	const k = inOutro ? T.n : Math.max(-1, Math.min(T.n - 1, Math.floor((frame - T.hook) / T.spotLen)));
	const local = k >= 0 && !inOutro ? frame - T.spot(k) : 0;

	let view: View;
	if (inOutro) {
		const t = ease(interpolate(frame - T.outro, [0, MOVE + 6], [0, 1], clamp));
		view = lerpView(views.spot[T.n - 1], views.overview, t);
		view = {...view, s: view.s * (1 + 0.02 * interpolate(frame - T.outro, [0, 100], [0, 1], clamp))};
	} else if (k < 0) {
		view = views.overview;
	} else {
		const from = k === 0 ? views.overview : views.spot[k - 1];
		const t = ease(interpolate(local, [0, MOVE], [0, 1], clamp));
		view = lerpView(from, views.spot[k], t);
		// A slow push-in while the spot holds, so the frame never sits dead still.
		view = {...view, s: view.s * (1 + 0.035 * interpolate(local, [MOVE, T.spotLen], [0, 1], clamp))};
	}

	// Never show past the edge of the map: zoom in just enough to cover the
	// card, and slide the map so it always fills it.
	view = {...view, s: Math.max(view.s, card.width / map.width, card.height / map.height)};
	const tx = Math.min(0, Math.max(card.width - map.width * view.s, SAFE_CX - view.cx * view.s));
	const ty = Math.min(0, Math.max(card.height - map.height * view.s, SAFE_CY - view.cy * view.s));
	const toCard = (p: Pt): Pt => [p[0] * view.s + tx, p[1] * view.s + ty];

	const enter = spring({frame: frame - enterAt, fps, config: {damping: 18, stiffness: 120, mass: 0.9}});
	if (frame < enterAt) return null;

	const drawProgress = (j: number) => {
		if (inOutro || j < k) return 1;
		if (j > k) return 0;
		return ease(interpolate(local, [DRAW_DELAY, DRAW_DELAY + DRAW_LEN], [0, 1], clamp));
	};

	const sw = (px: number) => px / view.s;

	return (
		<div
			style={{
				position: 'absolute',
				left: card.left,
				top: card.top,
				width: card.width,
				height: card.height,
				borderRadius: card.radius,
				overflow: 'hidden',
				background: C.base,
				opacity: enter,
				transform: `translateY(${(1 - enter) * 320}px) scale(${0.92 + 0.08 * enter})`,
				boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 2px rgba(253,248,242,0.08)',
			}}
		>
			<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${view.s})`}}>
				<Img src={staticFile(map.src)} style={{position: 'absolute', left: 0, top: 0, width: map.width, height: map.height}} />
				<svg width={map.width} height={map.height} viewBox={`0 0 ${map.width} ${map.height}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
					<defs>
						{map.spots.map((s, j) => (
							<linearGradient key={j} id={`rg${j}`} gradientUnits="userSpaceOnUse" x1={campus[0]} y1={campus[1]} x2={s.x} y2={s.y}>
								<stop offset="0%" stopColor={C.ember} />
								<stop offset="100%" stopColor={C.saffron} />
							</linearGradient>
						))}
					</defs>
					{map.spots.map((s, j) => {
						const p = drawProgress(j);
						if (p <= 0) return null;
						const L = lengths[j];
						const active = j === k && !inOutro;
						const dash = {strokeDasharray: `${L} ${L}`, strokeDashoffset: L * (1 - p)};
						const width = active ? 10 : inOutro ? 7 : 6;
						const opacity = active || inOutro ? 1 : 0.42;
						return (
							<g key={j} opacity={opacity}>
								<path d={pathD(s.route)} fill="none" stroke={C.ember} strokeWidth={sw(width * 2.8)} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} style={{...dash, filter: `blur(${sw(9)}px)`}} />
								<path d={pathD(s.route)} fill="none" stroke={`url(#rg${j})`} strokeWidth={sw(width)} strokeLinecap="round" strokeLinejoin="round" style={dash} />
							</g>
						);
					})}
				</svg>
			</div>

			{/* Street names: constant size on screen, laid along the street. */}
			{map.labels.map((l, i) => {
				const [x, y] = toCard([l.x, l.y]);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							transform: `translate(-50%, -50%) rotate(${l.angle}deg)`,
							fontFamily: TEXT,
							fontWeight: 600,
							fontSize: 22,
							letterSpacing: 0.6,
							color: C.inkMid,
							opacity: 0.75,
							whiteSpace: 'nowrap',
							textShadow: `0 0 6px ${C.base}, 0 0 10px ${C.base}`,
						}}
					>
						{l.name}
					</div>
				);
			})}

			{/* Campus. */}
			{(() => {
				const [x, y] = toCard(campus);
				return (
					<>
						<div style={{position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: 30, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.55), 0 0 0 6px rgba(253,248,242,0.18)'}}>
							<CapIcon size={34} color={C.base} />
						</div>
						<div
							style={{
								position: 'absolute',
								left: labelLeft ? undefined : x + 40,
								right: labelLeft ? card.width - x + 40 : undefined,
								top: y - 24,
								height: 48,
								padding: '0 18px',
								borderRadius: 24,
								background: 'rgba(12,9,18,0.88)',
								border: '2px solid rgba(253,248,242,0.16)',
								display: 'flex',
								alignItems: 'center',
								fontFamily: TEXT,
								fontWeight: 700,
								fontSize: 26,
								color: C.ink,
								whiteSpace: 'nowrap',
							}}
						>
							{map.campus.label}
						</div>
					</>
				);
			})()}

			{/* The head of the route while it draws. */}
			{map.spots.map((s, j) => {
				const p = drawProgress(j);
				if (!(j === k && !inOutro && p > 0 && p < 1)) return null;
				const [x, y] = toCard(pointAt(s.route, lengths[j] * p));
				return <div key={j} style={{position: 'absolute', left: x - 11, top: y - 11, width: 22, height: 22, borderRadius: 11, background: C.ink, boxShadow: `0 0 0 6px rgba(255,95,31,0.45), 0 0 24px ${C.ember}`}} />;
			})}

			{/* Visited and outro pins. */}
			{map.spots.map((s, j) => {
				if (!(inOutro || j < k)) return null;
				const [x, y] = toCard([s.x, s.y]);
				const r = inOutro ? 26 : 20;
				const pop = inOutro ? spring({frame: frame - T.outro - 10 - j * 3, fps, config: {damping: 12, stiffness: 170}}) : 1;
				return (
					<div
						key={j}
						style={{
							position: 'absolute',
							left: x - r,
							top: y - r,
							width: r * 2,
							height: r * 2,
							borderRadius: r,
							transform: `scale(${pop})`,
							background: inOutro ? C.ember : C.elevated,
							border: `3px solid ${inOutro ? C.ink : 'rgba(255,95,31,0.7)'}`,
							color: inOutro ? C.onAccent : C.ink,
							fontFamily: DISPLAY,
							fontWeight: 900,
							fontSize: inOutro ? 26 : 20,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxSizing: 'border-box',
							boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
						}}
					>
						{j + 1}
					</div>
				);
			})}

			{/* The active pin: lands when the route arrives, then pulses. */}
			{!inOutro && k >= 0 && local >= POP_AT
				? (() => {
						const s = map.spots[k];
						const [x, y] = toCard([s.x, s.y]);
						const pop = spring({frame: local - POP_AT, fps, config: {damping: 9, stiffness: 190, mass: 0.8}});
						const ring = ((local - POP_AT) % 28) / 28;
						return (
							<>
								<div style={{position: 'absolute', left: x - 34 - ring * 40, top: y - 34 - ring * 40, width: 68 + ring * 80, height: 68 + ring * 80, borderRadius: '50%', border: `4px solid ${C.ember}`, opacity: 0.55 * (1 - ring)}} />
								<div
									style={{
										position: 'absolute',
										left: x - 34,
										top: y - 34,
										width: 68,
										height: 68,
										borderRadius: 34,
										transform: `scale(${pop})`,
										background: `linear-gradient(135deg, ${C.saffron}, ${C.ember})`,
										border: `4px solid ${C.ink}`,
										boxSizing: 'border-box',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontFamily: DISPLAY,
										fontWeight: 900,
										fontSize: 34,
										color: C.onAccent,
										boxShadow: `0 10px 30px rgba(0,0,0,0.55), 0 0 40px rgba(255,95,31,0.6)`,
									}}
								>
									{k + 1}
								</div>
							</>
						);
					})()
				: null}

			<div style={{position: 'absolute', inset: 0, boxShadow: 'inset 0 0 70px rgba(5,3,9,0.6)', borderRadius: card.radius, pointerEvents: 'none'}} />
			<div style={{position: 'absolute', left: 30, bottom: 22, fontFamily: TEXT, fontWeight: 600, fontSize: 17, color: C.inkMid, opacity: 0.9}}>
				{inOutro ? showCredits : map.attribution}
			</div>
		</div>
	);
};
