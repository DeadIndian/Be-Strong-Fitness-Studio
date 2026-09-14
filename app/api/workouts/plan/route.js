import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/auth/server";
import { adminDb } from "@/lib/firebase/admin";
import { GoogleGenAI } from "@google/genai";

export const dynamic = "force-dynamic";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const WORKOUT_PLAN_COLLECTION = "userAiWorkoutPlans";

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

function userPlanRef(uid) {
	return adminDb.collection(WORKOUT_PLAN_COLLECTION).doc(uid);
}

export async function GET() {
    try {
        const session = await getSessionContext();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshot = await userPlanRef(session.uid).get();
        if (!snapshot.exists) {
            return NextResponse.json({ plan: null, goals: null });
        }

        return NextResponse.json(snapshot.data());
    } catch (error) {
        console.error("Fetch Workout Plan Error:", error);
        return NextResponse.json(
            { error: "Unable to fetch workout plan right now." },
            { status: 500 },
        );
    }
}

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
        const plan = JSON.parse(text);
        
        // Save to Firebase
        await userPlanRef(session.uid).set({
            plan,
            goals,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({ plan, goals });
	} catch (error) {
        console.error("Gemini Workout Plan Error:", error);
		return NextResponse.json(
			{ error: "Unable to generate a workout plan right now." },
			{ status: 500 },
		);
	}
}

export async function DELETE() {
    const session = await getSessionContext();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
    
    try {
        await userPlanRef(session.uid).delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Workout Plan Error:", error);
		return NextResponse.json(
			{ error: "Unable to delete workout plan right now." },
			{ status: 500 },
		);
    }
}
