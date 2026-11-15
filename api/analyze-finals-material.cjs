function parseGeminiJson(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return JSON.parse(cleaned);
}

module.exports = async (req, res) => {
  try {
    // Your Google AI / Gemini API logic here
    
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

  try {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel Environment Variables.",
      });
    }
    const key = rawKey.trim();

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const {
      schoolName,
      courseCode,
      courseName,
      department,
      curriculumDetails,
      examFocus,
      studyStrategy,
      pastedText,
      additionalNotes,
      fileBase64,
      fileMimeType,
    } = body;

    if (!courseCode) {
      return res.status(400).json({ error: "courseCode is required." });
    }

    const activeSchool = schoolName || "D'Evelyn High School";
    const activeCourseName = courseName || "Course " + courseCode;

    const systemPrompt =
      "You are an expert Academic Coach for rigorous high school and AP curriculums. " +
      "Generate a concise, high-yield finals study deck for " +
      activeSchool +
      " — Course: " +
      courseCode +
      " (" +
      activeCourseName +
      "). " +
      "RULES: NO raw LaTeX (use clean plain unicode math). Keep explanations crisp (1-2 sentences). " +
      "Every quiz question must test real subject content. " +
      "Department: " + (department || "Deduce") +
      ", Focus: " + (curriculumDetails || "Standard") +
      ", Format: " + (examFocus || "Cumulative") +
      ", Strategy: " + (studyStrategy || "Active recall") +
      ". Notes: " + (additionalNotes || "None") + ".";

    const promptMessage =
      "Create a study companion deck for course: " +
      courseCode +
      '. Generate EXACTLY 25 concise multiple choice questions inside "quiz".' +
      (pastedText ? "\nReference notes:\n" + pastedText.slice(0, 12000) : "");

    const parts = [];
    if (fileBase64 && fileMimeType) {
      const cleanBase64 = fileBase64.replace(/^data:.*;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: fileMimeType,
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: promptMessage });

    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          required: ["summary", "timeline", "flashcards", "quiz"],
          properties: {
            summary: {
              type: "OBJECT",
              required: [
                "title",
                "curriculumExplanation",
                "topTipsForFinal",
                "synthesizedNotesParagraph",
                "coreCheatSheetMarkdown",
              ],
              properties: {
                title: { type: "STRING" },
                curriculumExplanation: { type: "STRING" },
                topTipsForFinal: { type: "ARRAY", items: { type: "STRING" } },
                synthesizedNotesParagraph: { type: "STRING" },
                coreCheatSheetMarkdown: { type: "STRING" },
              },
            },
            timeline: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                required: ["dayName", "activityTitle", "activityDescription"],
                properties: {
                  dayName: { type: "STRING" },
                  activityTitle: { type: "STRING" },
                  activityDescription: { type: "STRING" },
                },
              },
            },
            flashcards: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                required: ["question", "answer"],
                properties: {
                  question: { type: "STRING" },
                  answer: { type: "STRING" },
                },
              },
            },
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
    });

    const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];
    let lastError = null;

    for (const model of models) {
      const baseHost = key.startsWith("AQ.")
        ? "https://googleapis.com"
        : "https://googleapis.com";

      const apiUrl = [baseHost, model + ":generateContent?key=" + encodeURIComponent(key)].join("/");

      const geminiRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      const rawResponseText = await geminiRes.text();
      let data = null;
      try {
        data = JSON.parse(rawResponseText);
      } catch (e) {
        lastError = {
          error: "Non-JSON response from Google (" + geminiRes.status + "): " + rawResponseText.slice(0, 120),
        };
        continue;
      }

      if (!geminiRes.ok) {
        lastError = data;
        continue;
      }

      const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
      const firstCandidate = candidates.length > 0 ? candidates.at(0) : null;
      const respParts = Array.isArray(firstCandidate?.content?.parts)
        ? firstCandidate.content.parts
        : [];
      const firstPart = respParts.length > 0 ? respParts.at(0) : null;
      const replyText = firstPart?.text;

      if (replyText) {
        return res.status(200).json(parseGeminiJson(replyText));
      }
    }

    return res.status(500).json(lastError || { error: "Failed to reach Gemini API." });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Server error",
    });
  }
};
