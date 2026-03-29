import "next-auth";

declare module "next-auth" {
  interface Session {
    // session.user.id is the Google OAuth sub — always present after sign-in
  }
}
