/**
 * Helper functions for sending emails via n8n webhooks
 */

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";

export interface SendMagicLinkPayload {
  email: string;
  magicLink: string;
  type: "login" | "invite";
  role?: "admin" | "dispatcher" | "worker";
  companyName?: string;
}

/**
 * Sends a magic link email via n8n webhook
 */
export async function sendMagicLinkViaN8N(payload: SendMagicLinkPayload): Promise<void> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error("N8N_WEBHOOK_URL environment variable is not set");
  }

  const requestBody = {
    email: payload.email,
    magicLink: payload.magicLink,
    type: payload.type,
    role: payload.role,
    companyName: payload.companyName,
  };

  console.log("Sending to n8n webhook:", N8N_WEBHOOK_URL);
  console.log("Payload:", JSON.stringify(requestBody, null, 2));

  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("n8n response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    console.log("n8n error response:", errorText);
    
    let errorMessage = `Failed to send email via n8n (${response.status} ${response.statusText})`;
    
    // Check for common n8n errors and provide helpful messages
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        // Check if it's specifically about inactive workflow
        if (errorJson.message.includes("not registered") || errorJson.message.includes("not active")) {
          errorMessage = "n8n workflow is not active. Please activate the workflow in n8n (toggle in top-right of editor).";
        } else {
          errorMessage = `n8n error: ${errorJson.message}`;
        }
      } else if (errorJson.code) {
        errorMessage = `n8n error (code ${errorJson.code}): ${errorText}`;
      }
    } catch {
      // If parsing fails, check status code for common issues
      if (response.status === 404) {
        errorMessage = `n8n webhook not found (404). Please check:\n` +
          `1. The webhook URL is correct: ${N8N_WEBHOOK_URL}\n` +
          `2. The workflow is active in n8n\n` +
          `3. The webhook path matches the workflow's webhook node path\n` +
          `Response: ${errorText}`;
      } else {
        errorMessage = `n8n error (${response.status}): ${errorText}`;
      }
    }
    
    throw new Error(errorMessage);
  }
}
