import { AuthLayoutClient } from './AuthLayoutClient';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Vishnu Finance",
  description: "Login and registration for Vishnu Finance",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutClient>{children}</AuthLayoutClient>;
}
