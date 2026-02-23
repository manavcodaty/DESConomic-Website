export async function uploadFileToConvex(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": file.type
    },
    body: file
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  const data = (await res.json()) as { storageId: string };
  return data.storageId;
}
