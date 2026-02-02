import { NextResponse } from "next/server";

/**
 * Test endpoint to verify n8n webhook is working
 * Call: GET /api/test-n8n-webhook
 */
export async function GET() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_WEBHOOK_URL not configured" },
      { status: 500 }
    );
  }

  try {
    const testPayload = {
      email: "test@example.com",
      magicLink: "https://example.com/test-link",
      type: "login" as const,
    };

    console.log("Testing n8n webhook:", webhookUrl);
    console.log("Test payload:", JSON.stringify(testPayload, null, 2));

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return NextResponse.json({
      webhookUrl,
      status: response.status,
      statusText: response.statusText,
      response: responseData,
      success: response.ok,
    });
  } catch (error) {
    return NextResponse.json(
      {
        webhookUrl,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 }
    );
  }
}
