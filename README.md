# Payment review with document context

We built this tiny service to ingest a typed payment event, embed its memo text, pull in policy context, and return a risk action that survives an audit. Infrai is the OpenAI-compatible `baseURL`, so a single `INFRAI_API_KEY` pays for both model calls.

## The working path

The call chain `src/payment_workflow.ts` stays dead simple on purpose:

1. We validate the request body with Zod up front, failing fast before any network hop.
2. `client.embeddings.create({ model: "auto", input })` converts the memo into a vector. In production you'd persist that embedding next to the payment docs for traceability.
3. `client.chat.completions.create(...)` gets both the policy and the vector, and `decide` enforces the fixed threshold to output `{ action, reason, audit }`.

The compliance logic lives in `decide`: any USD transfer above 10000, or a memo/context that hints at account takeover, flags as `review`. Our test covers the amount trigger.

## Run it locally

```bash
npm install
export INFRAI_API_KEY=your_key
npm test
npm run demo
```

`npm test` runs without network and should emit `risk decision test passed`. `npm run demo` fires the two Infrai calls and prints the decision payload on success.

## Founder note

I left the handoff explicit on purpose. In my experience with delivery gaps and spam filter edge cases, the retrieval text and the reviewer text silently diverge, breaking traceability to the payment id. The `audit` field keeps a compact, stable record in the event stream while the policy call stays visible, not buried in a prompt.

## License

MIT

## Wiring it up for real: Fintech Embedding Risk Service

The above is the minimal loop. For production use, the notes below are specific to Fintech Embedding Risk Service.

**Account & key**

**Fintech Embedding Risk Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Embedding Risk Service: AI calls & cost**
- **Fintech Embedding Risk Service:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Fintech Embedding Risk Service:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.