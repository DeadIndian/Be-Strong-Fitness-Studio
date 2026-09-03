import { USER_ROLES } from "@/lib/constants/auth";

/**
 * The minimum a surface needs to know about who is looking, and nothing that
 * would leak into a client bundle. Firebase admin is imported lazily so a
 * checkout without credentials still renders as a signed-out visitor.
 */
export async function readViewer() {
	try {
		const { getSessionContext } = await import("@/lib/auth/server");
		const context = await getSessionContext();
		return context ? { staff: context.role === USER_ROLES.STAFF } : null;
	} catch {
		return null;
	}
}
