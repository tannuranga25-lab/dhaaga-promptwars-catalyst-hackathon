import { NextResponse } from "next/server";
import { createCircleSchema, circleSchema } from "@/lib/schemas";
import { generateCircleCode, generatePasscode } from "@/lib/crypto";
import { hashPasscode } from "@/lib/crypto";
import { getFirestore } from "@/lib/db";

export async function POST(request: Request) {
  const parsed = createCircleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the circle details and try again." }, { status: 400 });
  }

  const caretakerPasscode = generatePasscode();
  const familyPasscode = generatePasscode();
  const passcodeHashes = {
    elder: await hashPasscode(parsed.data.elderPin),
    caretaker: await hashPasscode(caretakerPasscode),
    family: await hashPasscode(familyPasscode),
  };
  const db = getFirestore();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const displayCode = generateCircleCode();
    const circleCode = displayCode.replaceAll("-", "");
    const ref = db.collection("circles").doc(circleCode);
    const circle = circleSchema.parse({
      elderName: parsed.data.elderName,
      timezone: parsed.data.timezone,
      graceMinutes: 30,
      autonomy: "direct",
      passcodeHashes,
      passcodeVersion: 1,
      contacts: parsed.data.contacts,
      createdAt: new Date().toISOString(),
    });
    const result = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists) return false;
      transaction.create(ref, circle);
      return true;
    });
    if (result) {
      return NextResponse.json({
        circleCode: displayCode,
        passcodes: { caretaker: caretakerPasscode, family: familyPasscode },
      });
    }
  }

  return NextResponse.json({ error: "Could not create a circle right now. Please try again." }, { status: 503 });
}
