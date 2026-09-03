import { requireAuth } from "@/lib/auth/server";
import { USER_ROLES } from "@/lib/constants/auth";
import { getSiteSettings } from "@/lib/site/settings";
import MemberConsole from "@/app/components/user/member-console";

export const metadata = { title: "My membership" };

export default async function UserDashboardPage() {
	const [session, settings] = await Promise.all([
		requireAuth({ role: USER_ROLES.USER }),
		getSiteSettings(),
	]);
	const displayName = session.displayName || session.email?.split("@")[0] || "Member";

	return (
		<MemberConsole
			displayName={displayName}
			placeholder={settings.checkout.placeholder}
			payNote={settings.checkout.note}
		/>
	);
}
