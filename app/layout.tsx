import "./globals.css";
import AuthGuard from "../components/AuthGuard";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "Biga Bike Manager",
  description: "Gestionale officina e magazzino bici",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}