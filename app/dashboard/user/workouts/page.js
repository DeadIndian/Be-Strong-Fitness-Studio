import { requireAuth } from "@/lib/auth/server";
import { USER_ROLES } from "@/lib/constants/auth";
import WorkoutTracker from "@/app/components/user/workout-tracker";

export const metadata = { title: "My Workout Plan" };

export default async function UserWorkoutsPage() {
	const session = await requireAuth({ role: USER_ROLES.USER });
	const displayName = session.displayName || session.email?.split("@")[0] || "Member";

	return (
		<div className="mx-auto w-full max-w-board px-3 py-8 sm:px-6">
            <div className="mb-6 flex items-center justify-between">
			    <h1 className="text-[1.5rem] font-bold uppercase tracking-[0.02em] text-tile [font-stretch:82%]">
                    AI WORKOUT PLANNER
                </h1>
                <a href="/dashboard/user" className="text-sm font-bold uppercase tracking-widest text-action hover:underline">
                    &larr; Back to Dashboard
                </a>
            </div>
            <WorkoutTracker displayName={displayName} />
		</div>
	);
}
