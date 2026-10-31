import React from 'react';

type P = {size?: number; color?: string; style?: React.CSSProperties};

export const PinIcon: React.FC<P> = ({size = 40, color = 'currentColor', style}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" style={style}>
		<path
			fill={color}
			d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"
		/>
	</svg>
);

export const WalkIcon: React.FC<P> = ({size = 40, color = 'currentColor', style}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" style={style} fill="none" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
		<circle cx="13.2" cy="4.2" r="2" fill={color} stroke="none" />
		<path d="M12.2 8 10.6 14.2" />
		<path d="M12.1 9.2 15.2 11.6" />
		<path d="M11.7 9.4 8.6 11.4" />
		<path d="M10.6 14.2 13.2 17.4 13.2 21" />
		<path d="M10.6 14.2 8.7 18 6.6 21" />
	</svg>
);

export const CapIcon: React.FC<P> = ({size = 40, color = 'currentColor', style}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" style={style}>
		<path fill={color} d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3zm-6.8 9.2v3.6L12 19.5l6.8-3.7v-3.6L12 15.9l-6.8-3.7z" />
	</svg>
);

export const ArrowDown: React.FC<P> = ({size = 40, color = 'currentColor', style}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" style={style} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
		<path d="M12 4v15" />
		<path d="M5.5 12.5 12 19l6.5-6.5" />
	</svg>
);

export const ArrowRight: React.FC<P> = ({size = 40, color = 'currentColor', style}) => (
	<svg width={size} height={size} viewBox="0 0 24 24" style={style} fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
		<path d="M4 12h15" />
		<path d="M12.5 5.5 19 12l-6.5 6.5" />
	</svg>
);
