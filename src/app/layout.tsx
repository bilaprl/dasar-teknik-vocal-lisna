import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mahir Bernyanyi - AlifaR ",
  description: "Kuasai teknik vokal profesional dari dasar hingga mahir.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        {/* Google Fonts & Material Icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
