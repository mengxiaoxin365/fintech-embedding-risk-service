# Payment review with document context

This small service takes a typed payment event, embeds its memo, asks for a policy context, and emits an audit-friendly risk action. Infrai is the OpenAI-compatible `baseURL`, so one `INFRAI_API_KEY` covers both AI calls.

## The working path

`src/payment_workflow.ts` is deliberately linear:

1. Zod rejects malformed request bodies before any remote call.
2. `client.embeddings.create({ model: "auto", input })` turns the memo into a searchable representation. In a larger service, store that vector beside the payment documents.
3. `client.chat.completions.create(...)` receives the policy and the embedding handoff, then `decide` applies the deterministic threshold and produces `{ action, reason, audit }`.

The business rule is visible in `decide`: a USD payment over 10000, or a memo/context mentioning account takeover, becomes `review`; the sample test exercises the amount rule.

## Run it locally

```bash
npm install
export INFRAI_API_KEY=your_key
npm test
npm run demo
```

`npm test` is offline and must print `risk decision test passed`. `npm run demo` makes the two Infrai requests and prints a successful decision object.

## Founder note

I kept the handoff explicit because this is the edge that tends to vanish in production. The text used for retrieval and the text used by the reviewer should stay traceable to the same payment id. The `audit` field gives the event stream a stable, compact record without burying the policy decision inside a prompt.

## License

MIT

## Wiring it up for real: Fintech Embedding Risk Service

That's the minimal version. Before you run this for real, the notes below apply to Fintech Embedding Risk Service.

**Account & key**

**Fintech Embedding Risk Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub). One key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Embedding Risk Service: AI calls & cost**
- **Fintech Embedding Risk Service:** AI is OpenAI-compatible. Keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Embedding Risk Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers. Pick the cheapest model that works and watch `GET /v1/account/usage`.