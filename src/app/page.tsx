import { connection } from "next/server";
import { AssistantApp } from "@/components/AssistantApp";
import { groqKey } from "@/lib/server/config";

export default async function Home() {
  // Render per request, so each page gets its own CSP nonce and the AI status is current.
  await connection();
  return <AssistantApp aiEnabled={groqKey() !== null} />;
}
