import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
	try {
		const { messages, context } = await req.json();

		const systemPrompt = `You are an expert AI fitness coach for Be Strong Fitness Studio. 
You are speaking to a member. Be encouraging, precise, and friendly.

User Context:
${context}

Use this information to tailor your advice. Do not mention that you were given this context unless it is relevant to their question. Keep your answers concise and punchy.`;
		
		const contents = messages.map(m => ({
			role: m.role === "user" ? "user" : "model",
			parts: [{ text: m.content }]
		}));

		const responseStream = await ai.models.generateContentStream({
			model: "gemini-2.5-flash",
			contents,
			config: {
				systemInstruction: systemPrompt,
			}
		});

		// Convert async generator to ReadableStream
		const stream = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of responseStream) {
						const text = chunk.text;
						if (text) {
							controller.enqueue(new TextEncoder().encode(text));
						}
					}
					controller.close();
				} catch (e) {
					controller.error(e);
				}
			}
		});

		return new Response(stream, {
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		});
	} catch (err) {
		console.error("Chat API error:", err);
		return Response.json({ error: "Failed to generate response" }, { status: 500 });
	}
}
