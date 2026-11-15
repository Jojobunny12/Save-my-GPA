export const maxDuration = 60;

function parseGeminiJson(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return Response.json(
        { error: "GEMINI_API_KEY is missing in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const { courseCode, courseName, department, existingQuestions } = await request.json();
    if (!courseCode) {
      return Response.json({ error: "courseCode is required." }, { status: 400 });
    }

    const activeCourseName = courseName || `Course ${courseCode}`;

    const systemPrompt = `You are an expert Academic Coach specializing in rigorous high school and AP curriculums.
Generate 25 brand-new multiple choice questions for "${activeCourseName}" (${courseCode}, Department: ${department || "General"}).
- Write all formulas in clean plain unicode text (no LaTeX $$ or \\frac).
- Every question MUST test real subject content (no generic study-habit filler).
- Do not repeat these questions: ${(existingQuestions || []).map((q: any) => q.question).slice(0, 30).join(" | ")}`;

    const geminiRes = await fetch(
      `https://googleapis.com{encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Generate 25 MORE unique multiple choice questions inside the "quiz" array for course code: ${courseCode}.`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              required: ["quiz"],
              properties: {
                quiz: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    required: ["question", "options", "correctIndex", "explanation"],
                    properties: {
                      question: { type: "STRING" },
                      options: { type: "ARRAY", items: { type: "STRING" } },
                      correctIndex: { type: "INTEGER" },
                      explanation: { type: "STRING" },
                    },
                  },
                },
              },
            },
          },
        }),
      }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) {
      return Response.json(data, { status: geminiRes.status });
    }

    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      throw new Error("Empty response from Gemini API.");
    }

    return Response.json(parseGeminiJson(replyText));
  } catch (err: any) {
    return Response.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
