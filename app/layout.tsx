import "./globals.css";
import AuthGuard from "../components/AuthGuard";
import AppShell from "../components/AppShell";
import RegisterServiceWorker from "../components/RegisterServiceWorker";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body style={{ margin: 0 }}>
        <RegisterServiceWorker />
        <AuthGuard>
          <AppShell>{children}</AppShell>
        </AuthGuard>
      </body>
    </html>
  );
}