const express = require('express');
const path = require('path');
// Global genai import
const { GoogleGenAI } = require('@google/genai');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/advisor', async (req, res) => {
  try {
    const clientKey = req.headers['x-gemini-api-key'];
    const activeKey = clientKey || process.env.GEMINI_API_KEY;

    if (!activeKey) {
      return res.status(400).json({ error: "Gemini API Key is missing. Please set it in the app's Settings menu." });
    }

    const { cgpa, termGpa, currentSemCourses, level, semester } = req.body;
    
    const prompt = `You are an AI Academic Advisor for a student at HSTU (Hajee Mohammad Danesh Science and Technology University). 
    A student has provided their current semester (Level ${level} Semester ${semester}) details:
    - Cumulative CGPA: ${cgpa || '0.00'}
    - Current Semester GPA: ${termGpa || '0.00'}
    - Current Semester Courses & Grades: ${JSON.stringify(currentSemCourses || [])}
    
    Task:
    1. Analyze their performance for this semester.
    2. Identify weak/low-grade courses (e.g., grades below B or C) that might need a retake or improvement.
    3. Highlight strong areas where they excelled.
    4. Provide actionable, specific tips to boost their CGPA.
    
    Tone: Write in a simple, highly encouraging mix of Bengali and English (Banglish/Bengali text mixed with English terms). Format your response using clean text with simple bullet points (do not use complex markdown that HTML can't render easily, simple asterisks for bold and standard bullet points are fine). Keep it concise but impactful.`;
    
    const ai = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an empathetic, motivating academic advisor for university students. Communicate in a mix of Bengali and English. Be structured, concise, and highly relevant."
      }
    });

    res.json({ text: response.text });
  } catch (error) {
    if (error.message && error.message.includes("429")) {
      console.warn("Gemini API Rate limit hit. (429)");
      return res.status(429).json({ error: "Rate limited" });
    }
    
    if (error.message && error.message.includes("API key not valid")) {
      console.error("Gemini API Error: Invalid API key provided.");
      return res.status(400).json({ error: "Invalid Gemini API Key provided. Please check your Settings." });
    }
    
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Could not generate advice at this time." });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
