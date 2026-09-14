"use client";

import { useState, useEffect } from "react";
import Press from "../board/press";
import { TileText } from "../board/tile-text";

const STEPS = [
	{
		title: "Welcome to your dashboard",
		text: "We've kept things simple. This is your personal hub to manage your membership, track your nutrition, and find your next workout.",
	},
	{
		title: "Everything in one place",
		text: "Click any card on the main hub to open that tool. When you're done, just click 'Back to Hub' to return to the main menu.",
	},
	{
		title: "AI Workout Generation",
		text: "Don't know what to do today? Head over to the Exercises section and click '✨ Generate AI Workout Plan ✨' for a tailored session.",
	},
];

export default function WalkthroughIntro() {
	const [isOpen, setIsOpen] = useState(false);
	const [step, setStep] = useState(0);

	useEffect(() => {
		// Only run on client
		const seen = localStorage.getItem("dashboard_walkthrough_seen");
		if (!seen) {
			setIsOpen(true);
		}
	}, []);

	const dismiss = () => {
		localStorage.setItem("dashboard_walkthrough_seen", "true");
		setIsOpen(false);
	};

	const nextStep = () => {
		if (step < STEPS.length - 1) {
			setStep(step + 1);
		} else {
			dismiss();
		}
	};

	if (!isOpen) return null;

	const current = STEPS[step];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
			<div className="w-full max-w-md bg-glass border border-edge border-t-edge-lit p-8 shadow-2xl relative">
				<div className="mb-8">
					<span className="text-[0.66rem] font-bold uppercase tracking-[0.2em] text-action mb-2 block">
						Step {step + 1} of {STEPS.length}
					</span>
					<TileText as="h3" text={current.title.toUpperCase()} className="tile-nav mb-4" />
					<p className="text-sm leading-relaxed text-tile">
						{current.text}
					</p>
				</div>

				<div className="flex items-center justify-between mt-8 border-t border-edge pt-6">
					<button
						onClick={dismiss}
						className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-muted hover:text-tile transition-colors"
					>
						Skip Intro
					</button>
					<Press size="sm" onClick={nextStep}>
						{step < STEPS.length - 1 ? "Next" : "Get Started"}
					</Press>
				</div>
			</div>
		</div>
	);
}
