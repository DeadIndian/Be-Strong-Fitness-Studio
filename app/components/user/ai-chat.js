"use client";

import { useEffect, useState, useRef } from "react";
import { TileText } from "../board/tile-text";

export default function AiChat() {
	const [messages, setMessages] = useState([
		{ role: "model", content: "Hi there! I'm your AI Coach. How can I help you today?" }
	]);
	const [input, setInput] = useState("");
	const [context, setContext] = useState("No context available.");
	const [loading, setLoading] = useState(false);
	const messagesEndRef = useRef(null);

	// Fetch context on mount
	useEffect(() => {
		let live = true;
		(async () => {
			try {
				const [planRes, memRes] = await Promise.all([
					fetch("/api/user/plan", { cache: "no-store" }),
					fetch("/api/user/membership", { cache: "no-store" })
				]);
				const planBody = await planRes.json().catch(() => ({}));
				const memBody = await memRes.json().catch(() => ({}));
				if (!live) return;
				
				let ctx = "";
				if (planBody?.profile) {
					ctx += `Profile: Age ${planBody.profile.age}, ${planBody.profile.gender}, Height ${planBody.profile.heightCm}cm, Weight ${planBody.profile.weightKg}kg.\n`;
					ctx += `Activity Level: ${planBody.profile.activityLevel}, Trains ${planBody.profile.trainingDays} days/week.\n`;
					ctx += `Dietary Preference: ${planBody.profile.dietaryPreference}.\n`;
				} else {
					ctx += `Profile: Not provided yet.\n`;
				}
				if (planBody?.plan) {
					ctx += `Current Goal: ${planBody.plan.goalTitle}.\n`;
				}
				if (memBody?.membership) {
					ctx += `Membership Plan: ${memBody.membership.planTitle}, Status: ${memBody.membership.status}.\n`;
				}
				
				setContext(ctx);
			} catch (e) {
				console.error(e);
			}
		})();
		return () => { live = false; };
	}, []);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const sendMessage = async (e) => {
		e.preventDefault();
		if (!input.trim() || loading) return;

		const userMsg = { role: "user", content: input.trim() };
		const newMessages = [...messages, userMsg];
		setMessages(newMessages);
		setInput("");
		setLoading(true);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: newMessages, context }),
			});

			if (!response.body) throw new Error("No response body");

			// Add an empty assistant message first
			setMessages(prev => [...prev, { role: "model", content: "" }]);

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let done = false;
			let currentMessage = "";

			while (!done) {
				const { value, done: readerDone } = await reader.read();
				done = readerDone;
				if (value) {
					const chunk = decoder.decode(value, { stream: !done });
					currentMessage += chunk;
					setMessages(prev => {
						const copy = [...prev];
						copy[copy.length - 1].content = currentMessage;
						return copy;
					});
				}
			}
		} catch (err) {
			console.error(err);
			setMessages(prev => [...prev, { role: "model", content: "Sorry, I had trouble connecting to the server. Please try again." }]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col h-[600px] max-h-[70vh] bg-black/40 border border-edge rounded-3xl overflow-hidden shadow-2xl relative">
			{/* Header */}
			<div className="bg-glass border-b border-edge p-4 flex items-center justify-center shrink-0">
				<TileText text="AI COACH" className="tile-nav text-action" />
			</div>

			{/* Chat Area */}
			<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
				{messages.map((msg, idx) => (
					<div 
						key={idx} 
						className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
					>
						<div 
							className={`max-w-[80%] rounded-2xl p-4 text-[0.86rem] leading-relaxed ${
								msg.role === "user" 
									? "bg-action text-board rounded-tr-sm" 
									: "bg-glass border border-edge text-tile rounded-tl-sm"
							}`}
						>
							{msg.content}
						</div>
					</div>
				))}
				{loading && messages[messages.length - 1]?.role !== "model" && (
					<div className="flex justify-start">
						<div className="max-w-[80%] rounded-2xl p-4 bg-glass border border-edge text-muted rounded-tl-sm animate-pulse">
							Thinking...
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
			<div className="p-4 bg-glass border-t border-edge shrink-0">
				<form onSubmit={sendMessage} className="flex gap-2 relative">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ask about your diet or training..."
						className="flex-1 bg-black/50 border border-edge rounded-full px-6 py-3 text-[0.9rem] text-tile placeholder:text-muted focus:outline-none focus:border-action transition-colors"
						disabled={loading}
					/>
					<button
						type="submit"
						disabled={loading || !input.trim()}
						className="bg-action text-board rounded-full px-6 py-3 font-bold text-[0.8rem] uppercase tracking-wider hover:bg-tile transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Send
					</button>
				</form>
			</div>
		</div>
	);
}
