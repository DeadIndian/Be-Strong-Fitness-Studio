import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT = `You are a nutrition expert. 
Analyze the provided food name or image of food.
Return a JSON object containing the nutrition estimation for a typical serving.
The JSON must have the following structure:
{
  "name": "Food name (e.g., Chicken Curry)",
  "servingBasis": "e.g., Per 1 cup (240g)",
  "nutrients": {
    "calories": number or null,
    "protein": number or null,
    "carbs": number or null,
    "fat": number or null,
    "fiber": number or null,
    "sugar": number or null,
    "sodium": number or null
  }
}
If you cannot identify the food, return a JSON object with a single "error" key: { "error": "Could not identify food" }
Do not return any markdown formatting, only the raw JSON.`;

async function getNutritionFromGemini(query, imageBase64) {
    const contents = [];
    if (imageBase64) {
        contents.push({
            inlineData: {
                data: imageBase64,
                mimeType: "image/jpeg"
            }
        });
    }
    if (query) {
        contents.push(query);
    }
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            PROMPT,
            ...contents
        ],
        config: {
            responseMimeType: "application/json",
        }
    });

    const text = response.text;
    try {
        const data = JSON.parse(text);
        if (data.error) {
            throw new Error(data.error);
        }
        return data;
    } catch (e) {
        throw new Error("Failed to parse Gemini response");
    }
}

export async function POST(request) {
	const session = await getSessionContext();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
        const body = await request.json();
        const { query, image } = body;

        if (!query && !image) {
            return NextResponse.json(
                { error: "Please provide a search term or upload an image." },
                { status: 400 },
            );
        }

        const data = await getNutritionFromGemini(query, image);
        
        return NextResponse.json({
            item: {
                source: "Gemini AI",
                imageSource: image ? "User Upload" : null,
                image: image ? `data:image/jpeg;base64,\${image}` : null,
                ...data
            }
        });
	} catch (error) {
        console.error("Gemini Error:", error);
		return NextResponse.json(
			{ error: "Unable to fetch food nutrition right now." },
			{ status: 500 },
		);
	}
}

// Keep GET for backward compatibility or simple text searches if needed
export async function GET(request) {
    const session = await getSessionContext();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const query = request.nextUrl.searchParams.get("q")?.trim() || "";
	if (query.length < 2) {
		return NextResponse.json(
			{ error: "Please enter at least 2 characters." },
			{ status: 400 },
		);
	}

    try {
        const data = await getNutritionFromGemini(query, null);
        return NextResponse.json({
            item: {
                source: "Gemini AI",
                imageSource: null,
                image: null,
                ...data
            }
        });
    } catch (error) {
        console.error("Gemini Error:", error);
		return NextResponse.json(
			{ error: "Unable to fetch food nutrition right now." },
			{ status: 500 },
		);
	}
}
