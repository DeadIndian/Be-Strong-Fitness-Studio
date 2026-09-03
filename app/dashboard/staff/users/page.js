import { requireStaff } from "@/lib/auth/server";
import UserManagementTable from "@/app/components/staff/user-management-table";
import { Stamp, TileText } from "@/app/components/board/tile-text";
import { getStaffUsers } from "../staff-data";

export const metadata = { title: "Accounts" };

export default async function StaffUsersPage() {
	const session = await requireStaff();
	const users = await getStaffUsers();

	return (
		<div className="mx-auto flex w-full max-w-board flex-col gap-6 px-3 py-8 sm:px-6">
			<header className="flex flex-col gap-3">
				<Stamp tone="action">Who can sign in</Stamp>
				<TileText as="h1" text="ACCOUNTS" className="tile-md" />
				<p className="max-w-measure text-[0.88rem] leading-relaxed text-muted">
					Everyone who has signed up. Make somebody staff and they can edit the website.
				</p>
			</header>
			<UserManagementTable initialUsers={users} currentUid={session.uid} />
		</div>
	);
}
