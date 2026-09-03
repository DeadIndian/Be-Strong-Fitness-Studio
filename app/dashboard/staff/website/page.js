import { requireStaff } from "@/lib/auth/server";
import { getSiteSettings, missingFacts } from "@/lib/site/settings";
import WebsiteEditor from "@/app/components/staff/website-editor";

export const metadata = { title: "Website" };

export default async function WebsitePage() {
	await requireStaff();
	const settings = await getSiteSettings();
	return <WebsiteEditor initial={settings} gaps={missingFacts(settings)} />;
}
