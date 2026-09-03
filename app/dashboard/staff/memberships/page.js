import { requireStaff } from "@/lib/auth/server";
import { ALLOWED_MEMBERSHIP_STATUS } from "@/lib/constants/memberships";
import { getSiteSettings } from "@/lib/site/settings";
import MembershipManagementTable from "@/app/components/staff/membership-management-table";
import { TileText } from "@/app/components/board/tile-text";
import { getStaffUsers } from "../staff-data";

export const metadata = { title: "Memberships" };

export default async function StaffMembershipsPage() {
	await requireStaff();
	// The plans are the owner's, not a constant: an edit on the website binds here.
	const [users, settings] = await Promise.all([
		getStaffUsers({ includeMembership: true }),
		getSiteSettings(),
	]);

	return (
		<div className="mx-auto flex w-full max-w-board flex-col gap-6 px-3 py-8 sm:px-6">
			<header className="flex flex-col gap-3">
				<TileText as="h1" text="MEMBERS" className="tile-md" />
				<p className="max-w-measure text-[0.88rem] leading-relaxed text-muted">
					Who is on what plan. Set one, pause it, or end it — changes apply the moment you save the
					row.
				</p>
			</header>
			<MembershipManagementTable
				initialUsers={users}
				plans={settings.plans}
				allowedStatus={Array.from(ALLOWED_MEMBERSHIP_STATUS)}
			/>
		</div>
	);
}
