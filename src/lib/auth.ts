import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import User from "@/models/User";
import { Role } from "@/types";

// Hash bcrypt fixo de uma string aleatória — usado para gastar tempo de CPU
// mesmo quando o usuário não existe, evitando enumeration via timing.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8d.PfVnrSRb4Hb6Ld8I/9Ohu1gFmhO";

type RateEntry = { count: number; resetAt: number };
const loginAttempts = new Map<string, RateEntry>();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) return true;
  return false;
}

function clearRate(key: string): void {
  loginAttempts.delete(key);
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        const ip =
          (req?.headers?.["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          (req?.headers?.["x-real-ip"] as string) ||
          "unknown";
        const username = credentials.username.toLowerCase();
        const rateKey = `${ip}:${username}`;

        if (isRateLimited(rateKey)) {
          console.warn(`[auth] rate limit hit for ${rateKey}`);
          return null;
        }

        await connectDB();
        const user = await User.findOne({ username });

        // Constant-time: sempre roda bcrypt.compare, mesmo se o user não existe.
        const hashToCompare = user?.password ?? DUMMY_HASH;
        const isValid = await bcrypt.compare(credentials.password, hashToCompare);

        if (!user || !isValid) {
          console.warn(`[auth] failed login attempt user=${username} ip=${ip}`);
          return null;
        }

        clearRate(rateKey);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.username,
          role: user.role,
          image: user.avatar || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
