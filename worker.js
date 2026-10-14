export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method !== "POST" || url.pathname !== "/") {
            return json({ error: "Not allowed" }, 405);
        }

        try {
            const body = await request.json();
            const { action, prompt } = body;

            if (!prompt) {
                return json({ error: "Prompt is required" }, 400);
            }

            // ==========================================================
            // ROUTE A: Dynamic Layout Planner (Using active GLM-4.7-Flash)
            // ==========================================================
            if (action === "plan") {
                const systemPrompt = `You are a JSON Poster Layout Planner for a 768x1024 canvas.
Analyze the user's poster edit request and return ONLY a valid JSON object (no markdown, no code blocks, no explanation) matching this exact schema:
{
  "use_layout_dock": true,
  "top_header_text": "SHORT CATEGORY HEADER OR EMPTY STRING",
  "main_badge": {
    "show": true,
    "headline": "SHORT EXACT HEADLINE (MAX 22 CHARS)",
    "subtext": "SHORT SUBTEXT (MAX 36 CHARS)",
    "bg_hex": "#CD1834"
  },
  "info_pill": {
    "show": true,
    "text": "SALARY / PRICE / DATE / COUPON TEXT",
    "bg_hex": "#107C41"
  },
  "qr_code": {
    "show": true,
    "label": "SCAN TO APPLY"
  },
  "bullet_points": ["PERK OR DETAIL 1", "PERK OR DETAIL 2", "PERK OR DETAIL 3"],
  "visual_subject": {
    "show": true,
    "style": "photorealistic_person OR 2d_illustration",
    "clean_prompt": "Detailed visual description of ONLY the person, character, or object requested (NO text, NO letters, NO QR codes mentioned)"
  }
}`;

                const llmResponse = await env.AI.run(
                    "@cf/zai-org/glm-4.7-flash",
                    {
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: prompt }
                        ],
                    }
                );

                const rawText = llmResponse.response || llmResponse.result || "{}";
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                const parsedPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
                return json(parsedPlan, 200);
            }

            // ==========================================================
            // ROUTE B: Fast Image Generation (SDXL-Lightning)
            // ==========================================================
            const result = await env.AI.run(
                "@cf/bytedance/stable-diffusion-xl-lightning",
                {
                    prompt: prompt,
                    num_steps: 4,
                }
            );

            return new Response(result, {
                headers: { "Content-Type": "image/png" },
            });

        } catch (err) {
            return json({ error: "Worker execution failed", details: err.message }, 500);
        }
    },
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
