"use client";

/**
 * The roster. Not a table: on a phone a row is a card, on a wide screen the same
 * row lines up in columns. Every row carries its own two controls, and the one
 * destructive control asks first — through a native <dialog>, so Escape and the
 * focus trap are the platform's.
 */

import { useRef, useState } from "react";
import Panel, { Notice } from "../board/panel";
import Press from "../board/press";
import { Stamp } from "../board/tile-text";

function RoleStamp({ role }) {
	const staff = role === "staff";
	return (
		<span
			className="inline-flex min-h-[1.6rem] items-center px-2 text-[0.66rem] font-bold uppercase tracking-[0.18em]"
			style={{
				border: `1px solid ${staff ? "var(--action)" : "var(--rail)"}`,
				color: staff ? "var(--action)" : "var(--muted)",
			}}
		>
			{staff ? "Staff" : "Member"}
		</span>
	);
}

export default function UserManagementTable({ initialUsers, currentUid }) {
	const [users, setUsers] = useState(initialUsers);
	const [filter, setFilter] = useState("");
	const [busy, setBusy] = useState("");
	const [error, setError] = useState("");
	const [note, setNote] = useState("");
	const [pendingDelete, setPendingDelete] = useState(null);
	const confirm = useRef(null);

	const say = (ok, text) => {
		setError(ok ? "" : text);
		setNote(ok ? text : "");
	};

	const setRole = async (uid, role) => {
		setBusy(uid);
		say(true, "");
		try {
			const response = await fetch(`/api/staff/users/${uid}/role`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ role }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				say(false, body?.error ?? "Could not change that account's role.");
				return;
			}
			setUsers((current) => current.map((user) => (user.uid === uid ? { ...user, role } : user)));
			say(true, role === "staff" ? "That account can now edit the website." : "That account is a member again.");
		} catch {
			say(false, "Could not reach the studio database.");
		} finally {
			setBusy("");
		}
	};

	const remove = async (uid) => {
		setBusy(uid);
		say(true, "");
		try {
			const response = await fetch(`/api/staff/users/${uid}`, { method: "DELETE" });
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				say(false, body?.error ?? "Could not delete that account.");
				return;
			}
			setUsers((current) => current.filter((user) => user.uid !== uid));
			say(true, "Account deleted.");
		} catch {
			say(false, "Could not reach the studio database.");
		} finally {
			setBusy("");
			setPendingDelete(null);
			confirm.current?.close();
		}
	};

	const term = filter.trim().toLowerCase();
	const rows = [...users]
		.sort((a, b) => String(a.email ?? "").localeCompare(String(b.email ?? "")))
		.filter((user) =>
			term
				? `${user.email ?? ""} ${user.displayName ?? ""}`.toLowerCase().includes(term)
				: true,
		);

	return (
		<Panel
			title={`${users.length} ${users.length === 1 ? "account" : "accounts"}`}
			hint="Staff can edit the website and see everyone. Members only see their own membership."
			actions={
				users.length > 8 ? (
					<input
						className="board-input sm:w-56"
						value={filter}
						onChange={(event) => setFilter(event.target.value)}
						placeholder="Find by email or name"
						aria-label="Find an account"
					/>
				) : null
			}
		>
			<Notice tone={error ? "error" : "good"}>{error || note}</Notice>

			<ul className="flex flex-col gap-2">
				{rows.map((user) => {
					const self = user.uid === currentUid;
					const working = busy === user.uid;
					return (
						<li
							key={user.uid}
							className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4"
							style={{ border: "1px solid var(--rail)", backgroundColor: "var(--board)" }}
						>
							<div className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="truncate text-[0.84rem] font-bold text-tile">
									{user.email ?? "No email on the account"}
								</span>
								<Stamp>{user.displayName || "No name given"}</Stamp>
							</div>

							<RoleStamp role={user.role} />

							{self ? (
								<Stamp className="sm:w-44 sm:text-right">This is you</Stamp>
							) : (
								<div className="flex flex-wrap gap-2">
									<Press
										tone="ghost"
										size="sm"
										disabled={working}
										onClick={() => setRole(user.uid, user.role === "staff" ? "user" : "staff")}
									>
										{working ? "Saving" : user.role === "staff" ? "Make member" : "Make staff"}
									</Press>
									<Press
										tone="danger"
										size="sm"
										disabled={working}
										onClick={() => {
											setPendingDelete(user);
											confirm.current?.showModal();
										}}
									>
										Delete
									</Press>
								</div>
							)}
						</li>
					);
				})}
			</ul>

			{!rows.length ? <Stamp>No account matches that</Stamp> : null}

			<dialog ref={confirm} className="board-dialog" aria-label="Delete this account">
				<div className="flex flex-col gap-4 p-4">
					<Stamp tone="action">Delete an account</Stamp>
					<p className="text-[0.86rem] leading-relaxed text-tile">
						{pendingDelete?.email ?? "This account"} will be removed: the sign-in and the
						membership record on it both go. This cannot be undone.
					</p>
					<div className="flex flex-wrap justify-end gap-2">
						<Press
							tone="ghost"
							onClick={() => {
								setPendingDelete(null);
								confirm.current?.close();
							}}
						>
							Keep it
						</Press>
						<Press
							tone="danger"
							disabled={busy !== ""}
							onClick={() => remove(pendingDelete.uid)}
						>
							{busy ? "Deleting" : "Delete for good"}
						</Press>
					</div>
				</div>
			</dialog>
		</Panel>
	);
}
