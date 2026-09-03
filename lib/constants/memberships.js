/**
 * Membership status only. The plans themselves live in the owner's settings
 * (lib/site/defaults.js, overridden from the admin panel), so a price edit on
 * the website binds the checkout and the staff console too.
 */

export const MEMBERSHIP_STATUS = {
	ACTIVE: "active",
	PAUSED: "paused",
	CANCELLED: "cancelled",
	EXPIRED: "expired",
};

export const ALLOWED_MEMBERSHIP_STATUS = new Set(
	Object.values(MEMBERSHIP_STATUS),
);
