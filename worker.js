export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // 🚫 Only allow POST requests to /
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
                aiInputs.image_b64 = image_b64;
                aiInputs.strength = strength || 0.3; // Low strength for subtle modifications
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
