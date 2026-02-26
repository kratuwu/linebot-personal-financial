export async function replyMessage(replyToken: string, text: string) {
  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN!}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [
        {
          type: "text",
          text,
        },
      ],
    }),
  });
}

export async function quickReplyMessages(
  token: string,
  text: string,
  items: any[],
) {

  return fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN!}`,
    },
    body: JSON.stringify({
      replyToken: token,
      messages: [
        {
          type: "text",
          text,
          quickReply: {
            items
          },
        },
      ],
    }),
  });
}

export async function replyFlex(replyToken: string, messages: any[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });
const data = await res.json()
console.log(data)
}
export async function verifySignature(body: string, signature: string) {
  
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  )

  const computedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signed))
  )

  // timing-safe comparison
  return timingSafeEqual(computedSignature, signature)
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}