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
    async jwt({ token, account }) {
      if (account) {
        return { ...token };
      }
      return token;
    },

    async session({ session, token }) {
      // Expose the Google sub as session.user.id
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
