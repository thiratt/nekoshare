import type { Session, User } from "@/modules/auth/lib";

export class AccountService {
	getSessionPayload(session: Session, user: User) {
		return { session, user };
	}
}
