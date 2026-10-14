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

            // Decode helper: converts Base64 string to Uint8Array integer array
            const decodeB64 = (b64) => {
                const bin = atob(b64);
                const arr = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) {
                    arr[i] = bin.charCodeAt(i);
                }
                return Array.from(arr);
            };

            let result;

            if (image_b64 && mask_b64) {
                // Mode 1: Targeted Inpainting (Only modifies the white area of the mask)
                result = await env.AI.run(
                    "@cf/runwayml/stable-diffusion-v1-5-inpainting",
                    {
                        prompt: prompt,
                        image: decodeB64(image_b64),
                        mask: decodeB64(mask_b64),
                        strength: strength !== undefined ? strength : 0.85,
                        num_steps: num_steps || 20,
                    }
                );
            } else if (image_b64) {
                // Mode 2: Subtle Image-to-Image via DreamShaper 8 LCM
                result = await env.AI.run(
                    "@cf/lykon/dreamshaper-8-lcm",
                    {
                        prompt: prompt,
                        image_b64: image_b64,
                        strength: strength !== undefined ? strength : 0.3,
                        num_steps: num_steps || 8, // LCM models only need 6-8 steps
                        guidance: 2.0,
                    }
                );
            } else {
                // Mode 3: Pure Text-to-Image fallback
                result = await env.AI.run(
                    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
                    { prompt: prompt }
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
