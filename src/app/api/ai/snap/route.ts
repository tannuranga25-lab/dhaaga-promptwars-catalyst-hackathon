import { NextResponse } from "next/server";
import { z } from "zod";
import { extractPrescriptionDraft } from "@/lib/gemini";
import { getApiSession } from "@/lib/require-session";
import { hasValidOrigin } from "@/lib/csrf";

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 128 * 1024;
const photoSchema = z.instanceof(File).refine(
  (photo) => acceptedMimeTypes.has(photo.type) && photo.size > 0 && photo.size <= MAX_IMAGE_BYTES,
  "Choose a JPEG, PNG, or WebP image no larger than 4 MB.",
);

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const { session, status } = await getApiSession("editMedications");
  if (!session) return NextResponse.json({ error: "Sign in with permission to review medicine drafts." }, { status });
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Choose an image smaller than 4 MB after resizing." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP prescription photo." }, { status: 400 });
  }
  const photo = form.get("photo");
  const parsedPhoto = photoSchema.safeParse(photo);
  if (!parsedPhoto.success) {
    return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP image no larger than 4 MB." }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Photo reading is not configured. You can enter the medicine manually." }, { status: 503 });
  }

  try {
    const data = Buffer.from(await parsedPhoto.data.arrayBuffer()).toString("base64");
    const draft = await extractPrescriptionDraft(data, parsedPhoto.data.type);
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ error: "The photo could not be read. Please enter the details manually." }, { status: 502 });
  }
}
