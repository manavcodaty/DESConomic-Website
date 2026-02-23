import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { notFound, redirect } from "next/navigation";

export default async function ReviewDownloadPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  const review = await fetchQuery(api.monthlyReviews.getReviewDownloadUrl, {
    monthlyReviewId: id as Id<"monthlyReviews">,
    token
  });

  if (!review?.pdfUrl) {
    notFound();
  }

  redirect(review.pdfUrl);
}
