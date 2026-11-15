import LoginForm from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ circleCode?: string }>;
}) {
  const { circleCode } = await searchParams;
  return (
    <main id="main-content" className="page-shell">
      <LoginForm initialCircleCode={circleCode ?? ""} />
    </main>
  );
}
