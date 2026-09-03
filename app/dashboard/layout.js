import { requireAuth } from "@/lib/auth/server";

/** Every logged-in surface is one main region, so the skip link has one target. */
export default async function DashboardLayout({ children }) {
	await requireAuth();
	return <main id="board-main">{children}</main>;
}
