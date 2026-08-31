import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  const isDevLoginMode = !process.env.GOOGLE_CLIENT_ID;
  return <LoginForm isDevLoginMode={isDevLoginMode} />;
}
