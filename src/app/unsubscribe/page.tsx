import { UnsubscribeConfirm } from "@/components/unsubscribe-confirm";

export default async function UnsubscribePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="editorial-container py-16">
      <UnsubscribeConfirm token={token ?? ""} />
    </main>
  );
}
