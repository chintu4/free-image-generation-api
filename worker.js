export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method !== "POST" || url.pathname !== "/") {
            return json({ error: "Not allowed" }, 405);
        }

        try {
            const body = await request.json();
            const { prompt, image_b64, mask_b64, strength, num_steps } = body;

            if (!prompt) {
                return json({ error: "Prompt is required" }, 400);
            }

            const decodeB64 = (b64) => Array.from(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

            let result;

            if (image_b64 && mask_b64) {
                const safeSteps = Math.min(num_steps || 10, 15);
                result = await env.AI.run(
                    "@cf/runwayml/stable-diffusion-v1-5-inpainting",
                    {
                        prompt: prompt,
                        image: decodeB64(image_b64),
                        mask: decodeB64(mask_b64),
                        strength: strength !== undefined ? strength : 0.9,
                        num_steps: safeSteps,
                    }
                );
            } else if (image_b64) {
                result = await env.AI.run(
                    "@cf/lykon/dreamshaper-8-lcm",
                    {
                        prompt: prompt,
                        image_b64: image_b64,
                        strength: strength !== undefined ? strength : 0.85,
                        num_steps: Math.min(num_steps || 6, 8),
                        guidance: 1.8,
                    }
                );
            } else {
                result = await env.AI.run(
                    "@cf/bytedance/stable-diffusion-xl-lightning",
                    {
                        prompt: prompt,
                        num_steps: 4,
                    }
                );
            }

            return new Response(result, {
                headers: { "Content-Type": "image/png" },
            });

        } catch (err) {
            return json({ error: "Failed to generate image", details: err.message }, 500);
        }
    },
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
