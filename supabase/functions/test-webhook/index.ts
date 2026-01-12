import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const testData = {
      clientId: "test-client-123",
      clientName: "John",
      message: "What are my upcoming appointments?",
      messageId: "test-msg-456"
    };

    console.log("Sending test data to webhook:", testData);

    const response = await fetch('https://hook.us1.make.com/5wts4mehu53y8gzkn17m4wx7yxgeg172', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const responseText = await response.text();
    console.log("Webhook response status:", response.status);
    console.log("Webhook response:", responseText);

    return new Response(JSON.stringify({
      success: true,
      webhookStatus: response.status,
      webhookResponse: responseText,
      sentData: testData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
