// import { Resend } from "resend";
// import { Html, Head, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";
// import { env } from "@/config/env";

// interface EmailVerificationProps {
// 	userEmail: string;
// 	username: string;
// 	verificationUrl: string;
// }

// const resend = new Resend(env.MAIL_SERVER_KEY);

// const EmailVerification = (props: EmailVerificationProps) => {
// 	const { userEmail, username, verificationUrl } = props;

// 	return (
// 		<Html lang="en" dir="ltr">
// 			<Tailwind>
// 				<Head />
// 				<Body className="bg-gray-300 font-sans">
// 					<Container className="bg-white shadow-sm p-8">
// 						<Section>
// 							<Text className="text-[32px] font-bold text-gray-900 mb-[24px] text-center">
// 								Verify Your Email Address
// 							</Text>

// 							<Text className="text-[16px] text-gray-700 mb-[24px] leading-[24px]">Hi {username},</Text>

// 							<Text className="text-[16px] text-gray-700 mb-[24px] leading-[24px]">
// 								Thanks for signing up! We need to verify your email address ({userEmail}) to complete
// 								your account setup and ensure the security of your account.
// 							</Text>

// 							<Text className="text-[16px] text-gray-700 mb-[32px] leading-[24px]">
// 								Click the button below to verify your email address:
// 							</Text>

// 							<Section className="text-center mb-[32px]">
// 								<Button
// 									href={verificationUrl}
// 									className="bg-blue-500 text-white px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold no-underline box-border inline-block"
// 								>
// 									Verify Email Address
// 								</Button>
// 							</Section>

// 							<Text className="text-[14px] text-gray-600 mb-[24px] leading-[20px]">
// 								If the button doesn't work, you can also copy and paste this link into your browser:
// 							</Text>

// 							<Text className="text-[14px] text-blue-600 mb-[32px] leading-[20px] break-all">
// 								{verificationUrl}
// 							</Text>

// 							<Text className="text-[14px] text-gray-600 mb-[24px] leading-[20px]">
// 								This verification link will expire in 24 hours for security reasons. If you didn't
// 								create an account, you can safely ignore this email.
// 							</Text>

// 							<Hr className="border-gray-200 my-[32px]" />

// 							<Text className="text-[14px] text-gray-600 mb-[8px] leading-[20px]">
// 								Best regards,
// 								<br />
// 								The Team
// 							</Text>
// 						</Section>

// 						<Hr className="border-gray-200 my-[32px]" />

// 						<Section>
// 							<Text className="text-[12px] text-gray-500 text-center mb-[8px] m-0">
// 								123 Business Street, Suite 100
// 								<br />
// 								Business City, BC 12345
// 							</Text>

// 							<Text className="text-[12px] text-gray-500 text-center mb-[8px]">
// 								<a href="#" className="text-gray-500 no-underline">
// 									Unsubscribe
// 								</a>{" "}
// 								|
// 								<a href="#" className="text-gray-500 no-underline ml-[8px]">
// 									Privacy Policy
// 								</a>
// 							</Text>

// 							<Text className="text-[12px] text-gray-500 text-center m-0">
// 								© 2025 Your Company Name. All rights reserved.
// 							</Text>
// 						</Section>
// 					</Container>
// 				</Body>
// 			</Tailwind>
// 		</Html>
// 	);
// };

// export async function sendVerificationEmail(to: string, username: string, url: string): Promise<boolean> {
// 	const { data, error } = await resend.emails.send({
// 		from: "NekoShare <no-reply@notifications.weallarethe.best>",
// 		to: [to],
// 		subject: "Verify your email",
// 		react: <EmailVerification userEmail={to} username={username} verificationUrl={url} />,
// 	});

// 	if (error) {
// 		return false;
// 	}

// 	return true;
// }
