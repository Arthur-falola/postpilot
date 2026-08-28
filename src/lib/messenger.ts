// Envoie une "réponse privée" (private reply) suite à un commentaire public.
// C'est le seul mécanisme Meta autorisé pour initier un DM depuis un commentaire,
// sans être soumis à la fenêtre standard des 24h de Messenger.
// Doc Meta : "Private Replies" — nécessite la permission `pages_messaging`.

export async function sendMessengerDm({
  pageAccessToken,
  recipientCommentId,
  message,
}: {
  pageAccessToken: string;
  recipientCommentId: string;
  message: string;
}) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${recipientCommentId}/private_replies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        access_token: pageAccessToken,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message ?? "Échec de l'envoi du DM.");
  }

  return data;
}
