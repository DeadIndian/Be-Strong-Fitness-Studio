"use client";

/**
 * One door: the same form signs you in and signs you up. Firebase does the
 * credential work in the browser, then /api/auth/session mints the cookie the
 * server trusts and the client session is dropped — the cookie is the session.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	createUserWithEmailAndPassword,
	GoogleAuthProvider,
	sendPasswordResetEmail,
	signInWithPopup,
	signInWithEmailAndPassword,
	signOut,
	updateProfile,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { TextField } from "../board/field";
import Panel, { Notice } from "../board/panel";
import Press from "../board/press";
import Tabs from "../board/tabs";
import { Stamp, TileText } from "../board/tile-text";

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const MODES = [
	{ id: "login", label: "I have an account" },
	{ id: "register", label: "I am new here" },
];

/** Firebase's codes, said in the words a member would use. */
function readableError(error) {
	const haystack = `${error?.code ?? ""} ${error?.message ?? ""}`;
	if (haystack.includes("auth/email-already-in-use")) return "That email already has an account. Sign in instead.";
	if (haystack.includes("auth/invalid-credential")) return "That email and password do not match.";
	if (haystack.includes("auth/too-many-requests")) return "Too many tries. Wait a few minutes.";
	if (haystack.includes("auth/weak-password")) return "Use at least 8 characters, with a letter and a number.";
	if (haystack.includes("auth/invalid-email")) return "That email address does not look right.";
	if (haystack.includes("auth/operation-not-allowed")) return "Email sign-in is switched off for this project.";
	if (haystack.includes("auth/invalid-api-key") || haystack.includes("API key not valid")) {
		return "This site's Firebase key is wrong. Tell the studio.";
	}
	if (haystack.includes("auth/network-request-failed")) return "No connection. Check your internet.";
	if (haystack.includes("auth/unauthorized-domain")) return "This address is not allowed to sign people in yet.";
	if (haystack.includes("auth/popup-closed-by-user")) return "The Google window closed before it finished.";
	if (haystack.includes("auth/popup-blocked")) return "Your browser blocked the Google window.";
	if (haystack.includes("auth/account-exists-with-different-credential")) {
		return "That email is already here under a different sign-in method.";
	}
	return "That did not go through. Try again.";
}

export default function LoginForm({ brand }) {
	const router = useRouter();
	const [mode, setMode] = useState("login");
	const [reveal, setReveal] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState("");
	const [error, setError] = useState("");
	const [note, setNote] = useState("");

	const joining = mode === "register";

	const clear = () => {
		setError("");
		setNote("");
	};

	const finish = async (auth, user) => {
		const idToken = await user.getIdToken(true);
		const response = await fetch("/api/auth/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ idToken }),
		});
		const body = await response.json().catch(() => ({}));
		if (!response.ok) {
			const failure = new Error(body?.message ?? "Session setup failed");
			failure.code = body?.code ?? "session/failed";
			throw failure;
		}
		// The cookie is the session now; the browser copy would only go stale.
		await signOut(auth);
		router.push(body?.role === "staff" ? "/dashboard/staff" : "/dashboard/user");
		router.refresh();
	};

	const submit = async (event) => {
		event.preventDefault();
		clear();
		if (!email || !password) {
			setError("Both the email and the password are needed.");
			return;
		}
		if (joining && !PASSWORD_POLICY.test(password)) {
			setError("Use at least 8 characters, with a letter and a number.");
			return;
		}
		setBusy("email");
		try {
			const auth = clientAuth();
			const credential = joining
				? await createUserWithEmailAndPassword(auth, email, password)
				: await signInWithEmailAndPassword(auth, email, password);
			if (joining && name.trim()) {
				await updateProfile(credential.user, { displayName: name.trim() });
			}
			await finish(auth, credential.user);
		} catch (failure) {
			setError(readableError(failure));
		} finally {
			setBusy("");
		}
	};

	const google = async () => {
		clear();
		setBusy("google");
		try {
			const auth = clientAuth();
			const provider = new GoogleAuthProvider();
			provider.setCustomParameters({ prompt: "select_account" });
			const result = await signInWithPopup(auth, provider);
			await finish(auth, result.user);
		} catch (failure) {
			setError(readableError(failure));
		} finally {
			setBusy("");
		}
	};

	/** Locked out is the one thing a member cannot fix at the desk. */
	const forgot = async () => {
		clear();
		if (!email) {
			setError("Type your email above first, then press this again.");
			return;
		}
		setBusy("reset");
		try {
			await sendPasswordResetEmail(clientAuth(), email);
			setNote(`A reset link is on its way to ${email}.`);
		} catch (failure) {
			setError(readableError(failure));
		} finally {
			setBusy("");
		}
	};

	return (
		<div className="mx-auto grid w-full max-w-board items-start gap-8 px-3 py-10 sm:px-6 lg:min-h-[calc(100dvh-var(--rail-height))] lg:grid-cols-[1fr_26rem] lg:items-center lg:gap-12 lg:py-16">
			<div className="flex flex-col gap-5">
				<TileText as="h1" text={brand.shortName} className="tile-lg" press />
				<p className="max-w-measure text-[0.92rem] leading-relaxed text-tile">
					An account is where your plan, its dates and your own training numbers live. It is the
					only way to take a membership term in the app.
				</p>
				<ul className="flex flex-col">
					{[
						"Take a term and see the day it runs to",
						"Save your numbers, get calories and a week's split",
						"Look up any exercise and how it is done",
					].map((line) => (
						<li
							key={line}
							className="flex items-center gap-3 border-t border-edge py-2.5 text-[0.84rem] leading-snug text-muted"
						>
							<span aria-hidden="true" className="h-[0.3rem] w-[0.3rem] flex-none rotate-45 bg-action" />
							{line}
						</li>
					))}
				</ul>
				<Press href="/" tone="ghost" size="sm" className="self-start">
					Back to the board
				</Press>
			</div>

			<Panel>
				{/* The tab hairline runs the full width of the slab, so the strip reads as
				    part of the panel's own edge rather than a control floating inside it. */}
				<Tabs
					label="Sign in or join"
					items={MODES}
					active={mode}
					onSelect={(next) => {
						setMode(next);
						clear();
					}}
					className="-mx-4 -mt-4 px-4 sm:-mx-5 sm:-mt-5 sm:px-5"
				/>

				<Press tone="tile" size="md" full disabled={Boolean(busy)} onClick={google}>
					{busy === "google" ? "Opening Google" : "Continue with Google"}
				</Press>

				<div className="flex items-center gap-3">
					<span aria-hidden="true" className="h-px flex-1 bg-edge" />
					<Stamp>or with an email</Stamp>
					<span aria-hidden="true" className="h-px flex-1 bg-edge" />
				</div>

				<form onSubmit={submit} className="flex flex-col gap-4" noValidate>
					{joining ? (
						<TextField
							label="Your name"
							hint="What the studio will call you."
							value={name}
							onChange={(event) => setName(event.target.value)}
							autoComplete="name"
							maxLength={80}
							placeholder="Name"
						/>
					) : null}

					<TextField
						label="Email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						autoComplete="email"
						required
						placeholder="you@email.com"
					/>

					{/* The toggle sits beside the label, not inside it: a button within a
					    <label> is invalid markup and double-fires the label's own click. */}
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center justify-between gap-3">
							<Stamp tone="tile">Password</Stamp>
							<Press
								tone="ghost"
								size="sm"
								aria-pressed={reveal}
								onClick={() => setReveal((value) => !value)}
							>
								{reveal ? "Hide" : "Show"}
							</Press>
						</div>
						<label className="flex flex-col gap-1.5">
							<span className="sr-only">Password</span>
							<input
								className="board-input"
								type={reveal ? "text" : "password"}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								autoComplete={joining ? "new-password" : "current-password"}
								required
								placeholder="Password"
							/>
							{joining ? (
								<span className="text-[0.74rem] leading-snug text-muted">
									At least 8 characters, with a letter and a number.
								</span>
							) : null}
						</label>
					</div>

					<Notice tone="error">{error}</Notice>
					<Notice tone="good">{note}</Notice>

					<Press type="submit" size="lg" full disabled={Boolean(busy)}>
						{busy === "email" ? "One moment" : joining ? "Create my account" : "Sign in"}
					</Press>

					{joining ? null : (
						<Press
							tone="ghost"
							size="sm"
							className="self-start"
							disabled={Boolean(busy)}
							onClick={forgot}
						>
							{busy === "reset" ? "Sending" : "Forgot your password"}
						</Press>
					)}
				</form>
			</Panel>
		</div>
	);
}
