import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="block text-center text-lg font-semibold tracking-tight text-foreground"
        >
          Optimus
        </Link>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
