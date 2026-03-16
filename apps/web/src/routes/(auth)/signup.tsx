import { useEffect, useRef, useState } from "react";

import {
	createFileRoute,
	Link,
	useLocation,
	useRouter,
} from "@tanstack/react-router";

import { SignupCard } from "@workspace/app-ui/components/signup-card";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import type { TSignupSchema } from "@workspace/app-ui/types/schema";
import { useToast } from "@workspace/ui/hooks/use-toast";

import {
	authClient,
	invalidateSessionCache,
	signInWithGoogle,
} from "@/lib/auth";
import {
	getThaiAuthCallbackErrorMessage,
	getThaiAuthErrorMessage,
} from "@/lib/auth-error";

export const Route = createFileRoute("/(auth)/signup")({
	component: RouteComponent,
});

const GOOGLE_SIGNUP_ERROR_FALLBACK =
	"ไม่สามารถสมัครด้วย Google ได้ในขณะนี้";
const SIGNUP_ERROR_FALLBACK =
	"ไม่สามารถสร้างบัญชีได้ในขณะนี้";

function RouteComponent() {
	const location = useLocation();
	const router = useRouter();
	const { setGlobalLoading } = useNekoShare();
	const { toast } = useToast();
	const [socialErrorMessage, setSocialErrorMessage] = useState<string | null>(
		null,
	);
	const handledCallbackSearchRef = useRef<string>("");

	useEffect(() => {
		const currentSearch = window.location.search;
		if (!currentSearch || handledCallbackSearchRef.current === currentSearch) {
			return;
		}

		const errorMessage = getThaiAuthCallbackErrorMessage(
			currentSearch,
			GOOGLE_SIGNUP_ERROR_FALLBACK,
		);
		if (!errorMessage) {
			return;
		}

		handledCallbackSearchRef.current = currentSearch;
		setSocialErrorMessage(errorMessage);
		toast.error(errorMessage);

		const params = new URLSearchParams(currentSearch);
		params.delete("error");
		params.delete("error_description");

		const nextSearch = params.toString();
		const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
		window.history.replaceState({}, "", nextUrl);
	}, [location, toast]);

	const onGoogle = async () => {
		try {
			setSocialErrorMessage(null);
			setGlobalLoading(true);
			await signInWithGoogle("/signup", true);
		} catch (error) {
			toast.error(
				getThaiAuthErrorMessage(error, GOOGLE_SIGNUP_ERROR_FALLBACK),
			);
			setGlobalLoading(false);
		}
	};

	const onSubmit = async (data: TSignupSchema) => {
		setSocialErrorMessage(null);

		const { error } = await authClient.signUp.email({
			email: data.email,
			password: data.password,
			name: data.username,
			username: data.username,
		});

		if (error) {
			console.error("Signup failed:", error);
			toast.error(getThaiAuthErrorMessage(error, SIGNUP_ERROR_FALLBACK));
			return;
		}

		invalidateSessionCache();
		setGlobalLoading(true);

		try {
			await router.navigate({ to: "/home", replace: true });
		} catch (navigateError) {
			console.error("Navigation after signup failed:", navigateError);
			setGlobalLoading(false);
		}
	};

	return (
		<SignupCard
			linkComponent={Link}
			onGoogle={onGoogle}
			onSubmit={onSubmit}
			socialErrorMessage={socialErrorMessage}
		/>
	);
}
