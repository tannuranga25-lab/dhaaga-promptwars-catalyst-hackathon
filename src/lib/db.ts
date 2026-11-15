import { Firestore } from "@google-cloud/firestore";
import { firestoreOptions } from "@/lib/firestore-config";

let firestore: Firestore | undefined;

export function getFirestore(): Firestore {
  if (!firestore) {
    firestore = new Firestore(firestoreOptions());
  }
  return firestore;
}
