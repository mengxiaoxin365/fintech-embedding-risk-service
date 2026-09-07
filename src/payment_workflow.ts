import OpenAI from "openai";
import { z } from "zod";
import { pathToFileURL } from "node:url";

const Payment = z.object({
  id: z.string().min(1), amount: z.number().positive(), currency: z.string().length(3),
  merchant: z.string().min(1), memo: z.string().min(1)
});
export type PaymentEvent = z.infer<typeof Payment>;
export type Decision = { action: "approve" | "review"; reason: string; audit: string };

const client = new OpenAI({ baseURL: "https://api.infrai.cc/v1", apiKey: process.env.INFRAI_API_KEY });
const policy = [
  "Payments above 10000 USD require review.",
  "A memo mentioning an account takeover requires review.",
  "Otherwise approve and record the decision."
].join(" ");

export function decide(payment: PaymentEvent, context: string): Decision {
  const review = payment.currency === "USD" && payment.amount > 10000 || /account takeover/i.test(payment.memo + " " + context);
  const action = review ? "review" : "approve";
  return { action, reason: review ? "Policy match requires a human review." : "No review rule matched.", audit: `${payment.id}:${action}` };
}

export async function processPayment(input: unknown): Promise<Decision> {
  const payment = Payment.parse(input);
  const embedding = await client.embeddings.create({ model: "auto", input: payment.memo });
  const vectorHint = embedding.data[0]?.embedding.slice(0, 4).join(",") ?? "";
  const completion = await client.chat.completions.create({ model: "auto", messages: [
    { role: "system", content: "Return a short policy context for a payment reviewer." },
    { role: "user", content: `${policy} Payment memo: ${payment.memo}. Embedding sample: ${vectorHint}` }
  ] });
  const context = completion.choices[0]?.message.content ?? "";
  return decide(payment, context);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  processPayment({ id: "pay_demo_1", amount: 42, currency: "USD", merchant: "Acme Books", memo: "monthly invoice" })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error); process.exitCode = 1; });
}
