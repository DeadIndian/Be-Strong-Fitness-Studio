/**
 * The only form controls on the site. A field is a slot: label stamped above,
 * hint under it, and the error takes the hint's place rather than adding a line
 * that shifts the layout. No "use client" — these are plain markup, so a server
 * form and the admin panel share one input.
 *
 * The label wraps its control, so there is no id to generate and nothing to
 * mismatch between the server render and hydration.
 */

import { Stamp } from "./tile-text";

export function Field({ label, hint, error, children, className = "" }) {
	return (
		<label className={`flex flex-col gap-1.5 ${className}`}>
			{label ? <Stamp tone="tile">{label}</Stamp> : null}
			{children}
			{error ? (
				<span className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-warn">
					{error}
				</span>
			) : hint ? (
				<span className="text-[0.74rem] font-normal normal-case leading-snug tracking-normal text-muted">
					{hint}
				</span>
			) : null}
		</label>
	);
}

export function TextField({ label, hint, error, className = "", multiline = false, ...rest }) {
	const Tag = multiline ? "textarea" : "input";
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			<Tag className="board-input" aria-invalid={error ? "true" : undefined} {...rest} />
		</Field>
	);
}

export function SelectField({ label, hint, error, children, className = "", ...rest }) {
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			<select className="board-input" {...rest}>
				{children}
			</select>
		</Field>
	);
}

/** Native colour input: the platform's picker beats any we would ship. */
export function ColorField({ label, hint, value, onChange }) {
	return (
		<Field label={label} hint={hint}>
			<span className="flex items-center gap-2">
				<input
					type="color"
					className="board-swatch"
					value={value}
					onChange={(event) => onChange(event.target.value)}
				/>
				<input
					aria-label={`${label} hex value`}
					className="board-input tabular uppercase"
					value={value}
					spellCheck={false}
					onChange={(event) => onChange(event.target.value)}
				/>
			</span>
		</Field>
	);
}
