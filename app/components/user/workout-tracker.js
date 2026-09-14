"use client";

import { useState } from "react";
import Panel, { Notice, Readout } from "../board/panel";
import Press from "../board/press";
import { TextField } from "../board/field";
import { Stamp } from "../board/tile-text";

function CheckboxList({ title, exercises }) {
	if (!Array.isArray(exercises) || !exercises.length) return null;
	return (
		<div className="flex flex-col gap-3 border-t border-edge pt-4">
			<span className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-action">{title}</span>
			<ul className="flex flex-col gap-3">
				{exercises.map((item, index) => (
					<li key={index} className="flex flex-col gap-1 border border-edge p-3 shadow-sm bg-neutral-900">
                        <div className="flex items-start gap-3">
                            <input type="checkbox" className="mt-1 h-4 w-4 bg-transparent border border-muted flex-none accent-action cursor-pointer" />
                            <div className="flex flex-col gap-1 w-full">
                                <span className="text-[0.85rem] font-bold text-tile uppercase tracking-wider">{item.name}</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                    <span className="text-[0.75rem] text-muted"><span className="text-tile font-bold">Sets:</span> {item.sets}</span>
                                    <span className="text-[0.75rem] text-muted"><span className="text-tile font-bold">Reps:</span> {item.reps}</span>
                                </div>
                                {item.notes && <p className="text-[0.75rem] text-muted mt-1 bg-neutral-800 p-2 border-l border-action">{item.notes}</p>}
                            </div>
                        </div>
					</li>
				))}
			</ul>
		</div>
	);
}

export default function WorkoutTracker({ displayName }) {
    const [goals, setGoals] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [plan, setPlan] = useState(null);

    const generatePlan = async (e) => {
        e.preventDefault();
        if (!goals.trim()) {
            setError("Please describe what you want happening.");
            return;
        }

        setLoading(true);
        setError("");
        
        try {
            const response = await fetch('/api/workouts/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goals })
            });

            const body = await response.json().catch(() => ({}));

            if (!response.ok) {
                setError(body?.error || "Failed to generate plan.");
                return;
            }

            setPlan(body.plan);
        } catch (err) {
            console.error(err);
            setError("Failed to reach the AI planner.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <Panel title="What do you want happening?" hint="Describe your fitness goals in your own words, and our AI will build a routine for you.">
                <form className="flex flex-col gap-3" onSubmit={generatePlan}>
                    <TextField 
                        label="Your Goals"
                        name="goals"
                        placeholder="I want to lose 5kg and build upper body strength. I have access to dumbbells."
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        required
                    />
                    <div className="mt-2 flex items-center justify-between">
                        <Press type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? "Planning..." : "Generate My Plan"}
                        </Press>
                        <Notice tone="error">{error}</Notice>
                    </div>
                </form>
            </Panel>

            {plan && (
                <Panel title={plan.planTitle} hint={plan.summary}>
                    <div className="flex flex-col gap-6">
                        {plan.routines?.map((routine, idx) => (
                            <CheckboxList 
                                key={idx} 
                                title={routine.dayName} 
                                exercises={routine.exercises} 
                            />
                        ))}
                    </div>
                </Panel>
            )}
        </div>
    );
}
