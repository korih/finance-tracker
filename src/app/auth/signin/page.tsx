import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-muted-foreground">
          Sign in with your Google account to access your finance tracker.
        </p>
      </div>
      <SignInButton />
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        By signing in you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </div>
  );
}
