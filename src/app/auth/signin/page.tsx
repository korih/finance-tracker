import { SignInButton } from "@/components/sign-in-button";

export default function SignInPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-muted-foreground">
          Sign in with your Google account to access your spreadsheets.
        </p>
      </div>
      <SignInButton />
    </div>
  );
}
