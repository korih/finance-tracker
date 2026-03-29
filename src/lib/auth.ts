import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type {} from "./auth-types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Basic scopes only — we no longer access Google Sheets
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, pin the stable Google sub onto the token so it
      // never changes across sign-out / sign-in cycles.
      if (account?.providerAccountId) {
        token.sub = account.providerAccountId;
      } else if (!token.sub && (profile as { sub?: string })?.sub) {
        token.sub = (profile as { sub?: string }).sub;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
