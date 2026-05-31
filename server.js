import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json()); 

// 🔐 Secure Configurations using system env profiles
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY 
);

// 🎯 The Modernized Recommendation Endpoint
app.post('/api/recommend', async (req, res) => {
  try {
    const { maxRuntime, groupAnswers } = req.body;

    if (!maxRuntime || !groupAnswers || groupAnswers.length === 0) {
      return res.status(400).json({ error: "Missing required survey data." });
    }

    console.log("🧠 Backend received group data. Synthesizing preferences with GPT-5...");

    const summaryOfAnswers = groupAnswers.map(ans => 
      `User ${ans.personNumber}: Loves "${ans.favMovie}". Wants a "${ans.vibe}" film with a "${ans.mood}" vibe. Likes work involving: "${ans.actor}".`
    ).join('\n');

    // 🔥 Native 2026 Responses API Interface using GPT-5 mini
    const aiResponse = await openai.responses.create({
      model: 'o3-mini', // Lowest latency frontier reasoning tier
      instructions: `You are an expert film matchmaker. Your job is to analyze conflicting movie tastes from a group of people and write a 2-sentence target summary describing an ideal movie compromise that bridges their preferences. Incorporate their tone, pacing, and mood requests. Do not mention specific user names.`,
      input: `Group Time Limit constraint: ${maxRuntime}\n\nGroup Preferences:\n${summaryOfAnswers}`
    });

    // Clean, direct string extraction native to the 2026 SDK
    const synthesizedProfile = aiResponse.output_text;
    console.log(`🎯 Profile Synthesized: "${synthesizedProfile}"`);

    // C. Generate Vector Embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: synthesizedProfile
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // D. Interrogate Supabase
    console.log("🍿 Interrogating Supabase vector table...");
    const { data: matchedMovies, error: dbError } = await supabase.rpc('match_movies', {
      query_embedding: queryEmbedding,
      match_threshold: 0.25,
      match_count: 5 
    });

    if (dbError) throw dbError;

    res.json(matchedMovies);

  } catch (err) {
    console.error("💥 Backend Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 PopChoice Backend running securely with GPT-5 at http://localhost:${PORT}`);
});