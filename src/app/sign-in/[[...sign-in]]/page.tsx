import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="editorial-container py-12">
      <SignIn />
    </main>
  );
}
