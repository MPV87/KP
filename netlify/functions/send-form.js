// Datei: netlify/functions/send-form.js
// Zweck: Formular von der Website entgegennehmen und per Brevo versenden.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }

  let data;

  try {
    data = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Ungültige Formulardaten." })
    };
  }

  const name = String(data.name || "").trim();
  const company = String(data.company || "").trim();
  const email = String(data.email || "").trim();
  const phone = String(data.phone || "").trim();
  const subject = String(data.subject || "").trim();
  const message = String(data.message || "").trim();

  if (!name || !email || !subject || !message) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Bitte alle Pflichtfelder ausfüllen." })
    };
  }

  const brevoApiKey = process.env.BREVO_API_KEY;
  const recipientEmail = process.env.FORM_RECIPIENT_EMAIL || "office@kp-plattner.at";

  if (!brevoApiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Brevo API Key fehlt." })
    };
  }

  const htmlContent = `
    <h2>Neue Formularanfrage</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Firma:</strong> ${escapeHtml(company || "-")}</p>
    <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(phone || "-")}</p>
    <p><strong>Betreff:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Nachricht:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  const brevoPayload = {
    sender: {
      name: "KP Plattner GmbH",
      email: "office@kp-plattner.at"
    },
    to: [
      {
        email: recipientEmail
      }
    ],
    replyTo: {
      name: name,
      email: email
    },
    subject: `Neue Formularanfrage: ${subject}`,
    htmlContent: htmlContent
  };

  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey
      },
      body: JSON.stringify(brevoPayload)
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error("Brevo Fehler:", errorText);

      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "E-Mail konnte nicht versendet werden." })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Formular erfolgreich gesendet." })
    };
  } catch (error) {
    console.error("Serverfehler:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Serverfehler beim Versand." })
    };
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
