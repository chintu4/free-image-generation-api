export default {
    async fetch(request, env) {
        const API_KEY = env.API_KEY;
        const url = new URL(request.url);
        const auth = request.headers.get("Authorization");

        // 🔐 Simple API key check
        if (auth !== `Bearer ${API_KEY}`) {
            return json({ error: "Unauthorized" }, 401);
        }

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

            // 🛠️ Build input parameters for Cloudflare Workers AI
            const aiInputs = {
                prompt,
            };

            // If an original image is provided, configure subtle modifications (Img2Img)
            if (image_b64) {
                aiInputs.image_b64 = image_b64;
                // Default strength to 0.3 if not provided so it keeps the original poster mostly intact
                aiInputs.strength = strength || 0.3;
            }

            // 🧠 Run the generative model
            const result = await env.AI.run(
                "@cf/stabilityai/stable-diffusion-xl-base-1.0",
                aiInputs
            );

            // Return the binary image response directly
            return new Response(result, {
                headers: { "Content-Type": "image/jpeg" },
            });

        } catch (err) {
            return json({ error: "Failed to generate image", details: err.message }, 500);
        }
    },
};

// 📦 Helper function to return JSON responses cleanly
function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
