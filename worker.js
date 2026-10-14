export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method !== "POST" || url.pathname !== "/") {
            return json({ error: "Not allowed" }, 405);
        }

        try {
            const body = await request.json();
            const { prompt, image_b64, strength } = body;

            if (!prompt) {
                return json({ error: "Prompt is required" }, 400);
            }

            let result;

            if (image_b64) {
                // Decode base64 string to byte array (uint8 array)
                const binaryString = atob(image_b64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                // Dedicated Image-to-Image model
                result = await env.AI.run(
                    "@cf/runwayml/stable-diffusion-v1-5-img2img",
                    {
                        prompt: prompt,
                        image: [...bytes],
                        strength: strength !== undefined ? strength : 0.35,
                    }
                );
            } else {
                // Text-to-Image fallback
                result = await env.AI.run(
                    "@cf/stabilityai/stable-diffusion-xl-base-1.0",
                    { prompt: prompt }
                );
            }

            return new Response(result, {
                headers: { "Content-Type": "image/jpeg" },
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
