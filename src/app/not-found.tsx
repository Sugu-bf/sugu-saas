import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-4xl dark:bg-gray-800">
          🔍
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Page introuvable</h1>
        <p className="mt-3 max-w-md text-gray-500 dark:text-gray-400">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-sugu-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sugu-500/25 transition-all hover:bg-sugu-600"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
