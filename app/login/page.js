import { redirect } from "next/navigation";
import LoginForm from "@/app/components/auth/login-form";
import { getSessionContext } from "@/lib/auth/server";
import { getSiteSettings } from "@/lib/site/settings";

/** The studio renames itself in the admin panel; the tab title follows it. */
export async function generateMetadata() {
	const { brand } = await getSiteSettings();
	return {
		title: `Sign in | ${brand.name}`,
		description: `Sign in or open an account to take a membership term at ${brand.name}.`,
	};
}

export default async function LoginPage() {
	const [session, settings] = await Promise.all([getSessionContext(), getSiteSettings()]);
	if (session) {
		redirect(session.role === "staff" ? "/dashboard/staff" : "/dashboard/user");
	}

	return <LoginForm brand={settings.brand} />;
}
