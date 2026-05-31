import { openai, supabase } from '../config.js';
import https from 'https'; 

main();

async function main() {
  console.log("🎬 Starting clean 250 movie embedding pipeline...");
  try {
    // 1. Wipe out any partial data safely handling any ID type
    console.log("🧹 Clearing old entries from your Supabase table...");
    const { error: deleteError } = await supabase.from('movies').delete().not('id', 'is', null);
    if (deleteError) throw deleteError;

    // 2. Fetch from the working repository link
    console.log("📡 Connecting to the movie dataset...");
    const rawMovies = await fetchJsonFromUrl('https://raw.githubusercontent.com/theapache64/top250/master/top250.json');
    console.log(`📑 Successfully pulled all ${rawMovies.length} movies over the network!`);

    // 🔍 DEBUG STEP: Look at your terminal to see the actual keys available!
    console.log("🕵️‍♂️ Inspecting the first movie object structure:");
    console.log(JSON.stringify(rawMovies[0], null, 2)); 
    
    // 3. Build text blocks
   // 3. Build text blocks matching the schema.org structure perfectly
    const contextTexts = rawMovies.map(movie => {
      const title = movie.name || 'Unknown Title';
      
      // Extract just the 4-digit year from "1961-09-13"
      const year = movie.datePublished ? movie.datePublished.split('-')[0] : 'Unknown Year';
      
      // Dig into the nested aggregateRating object
      const ratingVal = movie.aggregateRating?.ratingValue;
      const rating = ratingVal ? `${ratingVal}/10` : 'N/A';
      
      // Clean up duration format (e.g., "PT1H50M" becomes "1h 50m")
      let runtime = 'Unknown Runtime';
      if (movie.duration) {
        runtime = movie.duration.replace('PT', '').toLowerCase().replace('h', 'h ');
      }
      
      // The plot is under "description"
      const plot = movie.description || 'No plot details provided.';
      
      // Genres are a clean array of strings
      const genres = Array.isArray(movie.genre) ? movie.genre.join(', ') : 'Unknown';

      // Pull the "name" out of each object in the director array
      const directors = Array.isArray(movie.director) 
        ? movie.director.map(d => d.name).filter(Boolean).join(', ') 
        : 'Unknown Director';

      // Pull the "name" out of each object in the actor array
      const actors = Array.isArray(movie.actor) 
        ? movie.actor.map(a => a.name).filter(Boolean).join(', ') 
        : 'Unknown Actors';

      return `Title: ${title}. Genres: ${genres}. Year: ${year}. Rating: ${rating}. Runtime: ${runtime}. Directors: ${directors}. Actors: ${actors}. Plot: ${plot}`;
    });

    // 4. Ask OpenAI for ALL 250 embeddings in a single API call
    console.log("🧠 Requesting batch embeddings from OpenAI...");
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: contextTexts
    });

    // 5. Match the vectors back to their records
  // 5. Match the vectors and images back to their records
    const dataToInsert = rawMovies.map((movie, index) => {
      return {
        content: contextTexts[index],
        embedding: embeddingResponse.data[index].embedding,
        image: movie.image || '' // 👈 This grabs the IMDb poster URL from the JSON!
      };
    });

    // 6. Bulk insert all 250 completed vectors to Supabase
    console.log(`🚀 Sending all ${dataToInsert.length} perfected entries to your Supabase table...`);
    const { error: insertError } = await supabase.from('movies').insert(dataToInsert);

    if (insertError) throw insertError;
    console.log('✅ Success! Your 250 movie vector database is completely seeded.');

  } catch (err) {
    console.error("💥 Pipeline stopped with an error:", err.message);
  }
}

// Network fetch utility
function fetchJsonFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error("Failed to parse downloaded data into JSON."));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}