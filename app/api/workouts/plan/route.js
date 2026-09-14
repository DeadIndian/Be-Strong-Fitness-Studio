import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT = `You are a professional fitness trainer. 
Based on the user's goals, generate a daily workout routine.
Return a JSON object containing the plan.
The JSON must have the following structure:
{
  "planTitle": "String - e.g., 3-Day Beginner Full Body",
  "summary": "String - A short encouraging summary of the routine",
  "routines": [
    {
      "dayName": "String - e.g., Day 1: Push",
      "exercises": [
        {
          "name": "String - Exercise name",
          "sets": "Number or String - e.g., 3",
          "reps": "String - e.g., 8-12",
          "notes": "String - Optional tips"
        }
      ]
    }
  ]
}
Do not return any markdown formatting, only the raw JSON.`;

export async function POST(request) {
	const session = await getSessionContext();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
        const body = await request.json();
        const { goals } = body;

        if (!goals) {
            return NextResponse.json(
                { error: "Please provide your fitness goals." },
                { status: 400 },
            );
        }
    
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                PROMPT,
                `User's goals: ${goals}`
            ],
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        const data = JSON.parse(text);
        
        return NextResponse.json({ plan: data });
	} catch (error) {
        console.error("Gemini Workout Plan Error:", error);
		return NextResponse.json(
			{ error: "Unable to generate a workout plan right now." },
			{ status: 500 },
		);
	}
}
