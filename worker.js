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

            const aiInputs = { prompt };

            if (image_b64) {
                // Decode base64 to byte array, then convert to an array of integers for the model
                const binaryString = atob(image_b64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                aiInputs.image = Array.from(bytes);
                aiInputs.strength = strength || 0.3; // Subtle edit strength
            }

            const result = await env.AI.run(
                "@cf/stabilityai/stable-diffusion-xl-base-1.0",
                aiInputs
            );

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
