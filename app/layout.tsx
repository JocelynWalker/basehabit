import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BaseHabit",
  description: "Grow habits on Base."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="6a641dd4281b6db318994b3a" />
        <meta
          name="talentapp:project_verification"
          content="c42c9b78aae56eba57dfde8a4be604e77ed7be3c75217a3aaa6e638e7fdce722659f88f95df0657f66295bcbf295bb5928bea3c2944414fe7983deeff42ae4a9"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
