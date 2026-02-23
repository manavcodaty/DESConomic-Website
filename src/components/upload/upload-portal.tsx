"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useClerk, useUser } from "@clerk/nextjs";
import { useAction, useConvex, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { UIInput } from "@/components/ui-input";
import { UITextarea } from "@/components/ui-textarea";
import { UIButton } from "@/components/ui-button";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { uploadFileToConvex } from "@/lib/upload";
import { createSlug, formatDate, readingTimeFromJson } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/badge";
import { env } from "@/lib/env";

type Tab = "create" | "mine" | "queue" | "topics" | "monthly" | "subscribers";

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }]
};

export function UploadPortal() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const convex = useConvex();

  const [syncError, setSyncError] = useState<string | null>(null);
  const [didSync, setDidSync] = useState(false);
  const [tab, setTab] = useState<Tab>("create");

  const syncCurrentUser = useMutation(api.users.syncCurrentUser);
  const me = useQuery(api.users.getMe, {});

  useEffect(() => {
    if (!isLoaded || !user || didSync) return;

    syncCurrentUser({ fallbackName: user.fullName ?? "Student Writer" })
      .then(() => setDidSync(true))
      .catch((error) => setSyncError(String(error)));
  }, [didSync, isLoaded, syncCurrentUser, user]);

  const isAllowedDomain = useMemo(() => {
    const primary = user?.primaryEmailAddress?.emailAddress ?? "";
    return primary.toLowerCase().endsWith(`@${env.schoolDomain.toLowerCase()}`);
  }, [user]);

  const isAdmin = me?.role === "admin";

  const topicList = (useQuery(api.topics.listTopics, {}) ?? []) as any[];
  const myArticles = (useQuery(api.articles.listMyArticles, {}) ?? []) as any[];
  const reviewQueue = (useQuery(api.articles.listSubmittedArticles, isAdmin ? {} : "skip") ?? []) as any[];
  const adminArticles = (useQuery(api.articles.listAdminArticles, isAdmin ? {} : "skip") ?? []) as any[];
  const subscribers = (useQuery(api.subscribers.listSubscribers, isAdmin ? {} : "skip") ?? []) as any[];
  const monthlyReviews = (useQuery(api.monthlyReviews.listMonthlyReviews, isAdmin ? {} : "skip") ?? []) as any[];
  const sendLogs = (useQuery(api.monthlyReviews.listEmailSendLogs, isAdmin ? {} : "skip") ?? []) as any[];

  const createDraft = useMutation(api.articles.createArticleDraft);
  const updateDraft = useMutation(api.articles.updateArticleDraft);
  const submitArticle = useMutation(api.articles.submitArticle);
  const withdrawSubmission = useMutation(api.articles.withdrawSubmission);
  const generateUploadUrl = useMutation(api.articles.generateUploadUrl);
  const uploadArticleImage = useMutation(api.articles.uploadArticleImage);

  const approveArticle = useMutation(api.articles.approveArticle);
  const rejectArticle = useMutation(api.articles.rejectArticle);
  const publishArticle = useMutation(api.articles.publishArticle);
  const setFeatured = useMutation(api.articles.setFeatured);
  const deleteArticle = useMutation(api.articles.deleteArticle);

  const createTopic = useMutation(api.topics.createTopic);
  const updateTopic = useMutation(api.topics.updateTopic);
  const deleteTopic = useMutation(api.topics.deleteTopic);

  const generateMonthlyUploadUrl = useMutation(api.monthlyReviews.generateMonthlyReviewUploadUrl);
  const uploadMonthlyReviewPDF = useMutation(api.monthlyReviews.uploadMonthlyReviewPDF);
  const sendMonthlyReview = useAction(api.monthlyReviews.sendMonthlyReview);

  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [tags, setTags] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState<unknown>(EMPTY_DOC);
  const [coverImageStorageId, setCoverImageStorageId] = useState<string | undefined>(undefined);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const [newTopicName, setNewTopicName] = useState("");
  const [topicEditMap, setTopicEditMap] = useState<Record<string, string>>({});

  const [monthLabel, setMonthLabel] = useState("February 2026");
  const [monthlyPdfFile, setMonthlyPdfFile] = useState<File | null>(null);
  const [monthlyMessage, setMonthlyMessage] = useState<string | null>(null);

  function resetDraftForm() {
    setEditingArticleId(null);
    setTitle("");
    setSubtitle("");
    setTopicId(topicList[0]?._id ?? "");
    setTags("");
    setSlug("");
    setExcerpt("");
    setBody(EMPTY_DOC);
    setCoverImageStorageId(undefined);
    setFormMessage(null);
  }

  useEffect(() => {
    if (!topicId && topicList[0]) {
      setTopicId(topicList[0]._id);
    }
  }, [topicId, topicList]);

  async function uploadImage(file: File) {
    const uploadUrl = await generateUploadUrl({});
    const storageId = await uploadFileToConvex(uploadUrl, file);
    const response = await uploadArticleImage({
      articleId: (editingArticleId ?? undefined) as never,
      storageId: storageId as never
    });
    return response.url;
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();

    try {
      const payload = {
        title,
        subtitle: subtitle || undefined,
        topicId: topicId as never,
        tags: tags
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        coverImageStorageId: (coverImageStorageId ?? undefined) as never,
        body,
        excerpt: excerpt || title,
        slug: slug || createSlug(title)
      };

      if (!editingArticleId) {
        const newId = await createDraft(payload);
        setEditingArticleId(newId);
        setFormMessage("Draft created.");
      } else {
        await updateDraft({ articleId: editingArticleId as never, ...payload });
        setFormMessage("Draft updated.");
      }
    } catch (error) {
      setFormMessage(String(error));
    }
  }

  async function submitCurrentDraft() {
    if (!editingArticleId) return;

    try {
      await submitArticle({ articleId: editingArticleId as never });
      setFormMessage("Article submitted for admin review.");
    } catch (error) {
      setFormMessage(String(error));
    }
  }

  function loadArticleForEdit(article: (typeof myArticles)[number]) {
    setEditingArticleId(article._id);
    setTitle(article.title);
    setSubtitle(article.subtitle ?? "");
    setTopicId(article.topicId);
    setTags(article.tags.join(", "));
    setSlug(article.slug);
    setExcerpt(article.excerpt);
    setBody(article.body);
    setCoverImageStorageId(article.coverImageStorageId);
    setTab("create");
  }

  async function uploadCover(file: File) {
    const uploadUrl = await generateUploadUrl({});
    const storageId = await uploadFileToConvex(uploadUrl, file);
    setCoverImageStorageId(storageId);
  }

  async function exportSubscribers() {
    const csv = await convex.query(api.subscribers.exportSubscribersCSV, {});
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "desconomic-subscribers.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleMonthlyUpload() {
    if (!monthlyPdfFile) return;

    try {
      const uploadUrl = await generateMonthlyUploadUrl({});
      const storageId = await uploadFileToConvex(uploadUrl, monthlyPdfFile);
      await uploadMonthlyReviewPDF({
        monthLabel,
        pdfStorageId: storageId as never
      });
      setMonthlyMessage("Monthly review uploaded.");
      setMonthlyPdfFile(null);
    } catch (error) {
      setMonthlyMessage(String(error));
    }
  }

  return (
    <main className="editorial-container py-8">
      <SignedOut>
        <div className="rounded-xl border border-[var(--line)] bg-white p-8">
          <h1 className="font-[family-name:var(--font-headline)] text-3xl">Writer Portal</h1>
          <p className="mt-2 text-[var(--muted)]">Sign in with your school email to create and submit articles.</p>
          <SignInButton mode="modal">
            <UIButton className="mt-6">Sign in</UIButton>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {!isAllowedDomain ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-6">
            <h2 className="font-[family-name:var(--font-headline)] text-2xl text-red-800">Access restricted</h2>
            <p className="mt-2 text-red-700">Only `{env.schoolDomain}` emails can use this portal.</p>
            <UIButton className="mt-4" onClick={() => signOut()}>
              Sign out
            </UIButton>
          </div>
        ) : syncError ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800">{syncError}</div>
        ) : !me ? (
          <div className="rounded-xl border border-[var(--line)] bg-white p-6">Initializing your profile...</div>
        ) : (
          <div className="space-y-6">
            <header className="rounded-xl border border-[var(--line)] bg-white p-6">
              <p className="kicker">Portal</p>
              <h1 className="mt-1 font-[family-name:var(--font-headline)] text-4xl">Upload Workspace</h1>
              <p className="mt-2 text-[var(--muted)]">
                Signed in as {me.name} ({me.role}).
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {([
                  ["create", "Create Article"],
                  ["mine", "My Drafts / Submissions"],
                  ["queue", "Review Queue"],
                  ["topics", "Topics"],
                  ["monthly", "Monthly Review PDF"],
                  ["subscribers", "Subscribers"]
                ] as const)
                  .filter(([key]) => {
                    if (key === "create" || key === "mine") return true;
                    return isAdmin;
                  })
                  .map(([key, label]) => (
                    <button
                      key={key}
                      className={`rounded-full border px-3 py-1 text-sm ${tab === key ? "border-black bg-black text-white" : "border-[var(--line)] bg-white"}`}
                      type="button"
                      onClick={() => setTab(key as Tab)}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </header>

            {tab === "create" ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h2 className="font-[family-name:var(--font-headline)] text-2xl">
                    {editingArticleId ? "Edit Draft" : "Create Article"}
                  </h2>
                  {editingArticleId ? (
                    <UIButton className="border-transparent bg-gray-100 text-black hover:bg-gray-200" onClick={resetDraftForm} type="button">
                      New Draft
                    </UIButton>
                  ) : null}
                </div>

                <form className="space-y-4" onSubmit={saveDraft}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span>Title *</span>
                      <UIInput required value={title} onChange={(event) => setTitle(event.target.value)} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>Subtitle</span>
                      <UIInput value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-1 text-sm">
                      <span>Topic *</span>
                      <select
                        required
                        className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                        value={topicId}
                        onChange={(event) => setTopicId(event.target.value)}
                      >
                        {topicList.map((topic) => (
                          <option key={topic._id} value={topic._id}>
                            {topic.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>Tags</span>
                      <UIInput placeholder="markets, policy" value={tags} onChange={(event) => setTags(event.target.value)} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span>Slug</span>
                      <UIInput
                        placeholder="auto-generated"
                        value={slug}
                        onChange={(event) => setSlug(createSlug(event.target.value))}
                      />
                    </label>
                  </div>

                  <label className="space-y-1 text-sm">
                    <span>Excerpt</span>
                    <UITextarea
                      rows={3}
                      value={excerpt}
                      onChange={(event) => setExcerpt(event.target.value)}
                      placeholder="Short summary for homepage cards"
                    />
                  </label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Cover image</p>
                      <label className="cursor-pointer rounded-md border border-[var(--line)] px-3 py-1 text-xs">
                        Upload cover
                        <input
                          hidden
                          accept="image/*"
                          type="file"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            await uploadCover(file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                    </div>
                    {coverImageStorageId ? <p className="text-xs text-[var(--muted)]">Cover uploaded.</p> : null}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Body editor</p>
                    <TiptapEditor value={body} onChange={setBody} onImageUpload={uploadImage} />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <UIButton type="submit">{editingArticleId ? "Save Draft" : "Create Draft"}</UIButton>
                    {editingArticleId ? (
                      <UIButton className="bg-[var(--accent)] hover:bg-[var(--accent)]/90" type="button" onClick={submitCurrentDraft}>
                        Submit for Approval
                      </UIButton>
                    ) : null}
                  </div>

                  {formMessage ? <p className="text-sm text-[var(--muted)]">{formMessage}</p> : null}
                </form>
              </section>
            ) : null}

            {tab === "mine" ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-6">
                <h2 className="font-[family-name:var(--font-headline)] text-2xl">My Drafts / Submissions</h2>
                <div className="mt-4 space-y-3">
                  {myArticles.map((article) => (
                    <div key={article._id} className="rounded-lg border border-[var(--line)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-[family-name:var(--font-headline)] text-xl">{article.title}</h3>
                          <p className="text-xs text-[var(--muted)]">
                            Updated {formatDate(article.updatedAt)} · {readingTimeFromJson(article.body)} min read
                          </p>
                        </div>
                        <StatusPill status={article.status} />
                      </div>

                      {article.rejectionReason ? (
                        <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">Rejected: {article.rejectionReason}</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <UIButton className="h-8 bg-black px-3 text-xs" onClick={() => loadArticleForEdit(article)} type="button">
                          Edit
                        </UIButton>
                        {article.status === "draft" || article.status === "rejected" ? (
                          <UIButton
                            className="h-8 bg-[var(--accent)] px-3 text-xs"
                            type="button"
                            onClick={async () => {
                              await submitArticle({ articleId: article._id });
                            }}
                          >
                            Submit
                          </UIButton>
                        ) : null}
                        {article.status === "submitted" ? (
                          <UIButton
                            className="h-8 bg-gray-600 px-3 text-xs"
                            type="button"
                            onClick={async () => {
                              await withdrawSubmission({ articleId: article._id });
                            }}
                          >
                            Withdraw
                          </UIButton>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "queue" && isAdmin ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-6">
                <h2 className="font-[family-name:var(--font-headline)] text-2xl">Review Queue</h2>
                <div className="mt-4 space-y-3">
                  {reviewQueue.map((article) => (
                    <div key={article._id} className="rounded-lg border border-[var(--line)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="kicker">{article.authorName}</p>
                          <h3 className="font-[family-name:var(--font-headline)] text-xl">{article.title}</h3>
                          <p className="mt-1 text-sm text-[var(--muted)]">{article.excerpt}</p>
                        </div>
                        <StatusPill status={article.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <UIButton className="h-8 px-3 text-xs" onClick={() => approveArticle({ articleId: article._id })} type="button">
                          Approve
                        </UIButton>
                        <UIButton
                          className="h-8 bg-[var(--accent)] px-3 text-xs"
                          type="button"
                          onClick={async () => {
                            const reason = window.prompt("Rejection reason")?.trim();
                            if (!reason) return;
                            await rejectArticle({ articleId: article._id, reason });
                          }}
                        >
                          Reject
                        </UIButton>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="mt-8 font-[family-name:var(--font-headline)] text-xl">Approved and published</h3>
                <div className="mt-3 space-y-3">
                  {adminArticles
                    .filter((article) => article.status !== "submitted")
                    .map((article) => (
                      <div key={article._id} className="rounded-lg border border-[var(--line)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="font-[family-name:var(--font-headline)] text-lg">{article.title}</h4>
                            <p className="text-xs text-[var(--muted)]">{article.slug}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill status={article.status} />
                            {article.featured ? <Badge variant="accent">Featured</Badge> : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {article.status === "approved" || article.status === "scheduled" ? (
                            <UIButton
                              className="h-8 px-3 text-xs"
                              type="button"
                              onClick={() => publishArticle({ articleId: article._id, mode: "now" })}
                            >
                              Publish now
                            </UIButton>
                          ) : null}
                          {article.status === "approved" ? (
                            <UIButton
                              className="h-8 bg-gray-700 px-3 text-xs"
                              type="button"
                              onClick={() => {
                                const value = window.prompt("Schedule publish (ISO date-time)");
                                if (!value) return;
                                const publishAt = new Date(value).getTime();
                                if (Number.isNaN(publishAt)) return;
                                publishArticle({ articleId: article._id, mode: "schedule", publishAt });
                              }}
                            >
                              Schedule
                            </UIButton>
                          ) : null}
                          <UIButton
                            className="h-8 bg-black px-3 text-xs"
                            type="button"
                            onClick={() => setFeatured({ articleId: article._id, featured: !article.featured })}
                          >
                            {article.featured ? "Unfeature" : "Feature"}
                          </UIButton>
                          <UIButton className="h-8 bg-red-700 px-3 text-xs" type="button" onClick={() => deleteArticle({ articleId: article._id })}>
                            Delete
                          </UIButton>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ) : null}

            {tab === "topics" && isAdmin ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-6">
                <h2 className="font-[family-name:var(--font-headline)] text-2xl">Topics</h2>
                <div className="mt-4 flex gap-2">
                  <UIInput placeholder="New topic" value={newTopicName} onChange={(event) => setNewTopicName(event.target.value)} />
                  <UIButton
                    onClick={async () => {
                      if (!newTopicName.trim()) return;
                      await createTopic({ name: newTopicName.trim() });
                      setNewTopicName("");
                    }}
                    type="button"
                  >
                    Add topic
                  </UIButton>
                </div>

                <div className="mt-4 space-y-2">
                  {topicList.map((topic) => (
                    <div key={topic._id} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] p-3">
                      <UIInput
                        value={topicEditMap[topic._id] ?? topic.name}
                        onChange={(event) =>
                          setTopicEditMap((prev) => ({
                            ...prev,
                            [topic._id]: event.target.value
                          }))
                        }
                      />
                      <UIButton
                        className="h-9 px-3 text-xs"
                        type="button"
                        onClick={() => updateTopic({ topicId: topic._id, name: topicEditMap[topic._id] ?? topic.name })}
                      >
                        Save
                      </UIButton>
                      <UIButton className="h-9 bg-red-700 px-3 text-xs" type="button" onClick={() => deleteTopic({ topicId: topic._id })}>
                        Delete
                      </UIButton>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "monthly" && isAdmin ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-6">
                <h2 className="font-[family-name:var(--font-headline)] text-2xl">Monthly Review PDF</h2>

                <div className="mt-4 grid gap-3 md:grid-cols-[2fr_2fr_1fr]">
                  <UIInput value={monthLabel} onChange={(event) => setMonthLabel(event.target.value)} />
                  <input
                    accept="application/pdf"
                    className="rounded-md border border-[var(--line)] p-2 text-sm"
                    type="file"
                    onChange={(event) => setMonthlyPdfFile(event.target.files?.[0] ?? null)}
                  />
                  <UIButton disabled={!monthlyPdfFile} onClick={handleMonthlyUpload} type="button">
                    Upload
                  </UIButton>
                </div>
                {monthlyMessage ? <p className="mt-2 text-sm text-[var(--muted)]">{monthlyMessage}</p> : null}

                <div className="mt-6 space-y-3">
                  {monthlyReviews.map((review) => (
                    <div key={review._id} className="rounded-md border border-[var(--line)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="font-[family-name:var(--font-headline)] text-xl">{review.monthLabel}</h3>
                          <p className="text-xs text-[var(--muted)]">Uploaded {formatDate(review.createdAt)}</p>
                        </div>
                        <Badge>{review.sendStatus ?? "not_sent"}</Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          className="rounded-md border border-[var(--line)] px-3 py-1.5 text-xs"
                          href={`/review/${review._id}?token=${review.secureToken}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open secure link
                        </a>
                        <UIButton
                          className="h-8 bg-[var(--accent)] px-3 text-xs"
                          type="button"
                          onClick={async () => {
                            const result = await sendMonthlyReview({ monthlyReviewId: review._id });
                            setMonthlyMessage(`Sent: ${result.successCount}, failures: ${result.failureCount}`);
                          }}
                        >
                          Send to subscribers
                        </UIButton>
                      </div>
                    </div>
                  ))}
                </div>

                <h3 className="mt-8 font-[family-name:var(--font-headline)] text-xl">Send logs</h3>
                <div className="mt-3 space-y-2">
                  {sendLogs.map((log) => (
                    <div key={log._id} className="rounded-md border border-[var(--line)] p-3 text-sm">
                      <p>
                        {formatDate(log.startedAt)} · Total {log.totalRecipients} · Success {log.successCount} · Failed {log.failureCount}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === "subscribers" && isAdmin ? (
              <section className="rounded-xl border border-[var(--line)] bg-white p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-[family-name:var(--font-headline)] text-2xl">Subscribers</h2>
                  <UIButton className="h-9 px-3 text-xs" type="button" onClick={exportSubscribers}>
                    Export CSV
                  </UIButton>
                </div>

                <div className="mt-4 space-y-2">
                  {subscribers.map((subscriber) => (
                    <div key={subscriber._id} className="flex flex-wrap items-center justify-between rounded-md border border-[var(--line)] p-3 text-sm">
                      <p>{subscriber.email}</p>
                      <div className="flex items-center gap-2">
                        <Badge>{subscriber.status}</Badge>
                        <span className="text-xs text-[var(--muted)]">{formatDate(subscriber.subscribedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </SignedIn>
    </main>
  );
}
