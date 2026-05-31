// 1. Centralized Application State
const state = {
    totalPeople: 0,
    currentPersonIndex: 1,
    maxRuntime: '',
    groupAnswers: [] 
};

// 2. DOM Elements Cache
const page1 = document.getElementById('page1');
const page2 = document.getElementById('page2');
const page3 = document.getElementById('page3');

const inputTotalPeople = document.getElementById('input-Total-People');
const inputMaxRuntime = document.getElementById('input-Max-Runtime');
const btnSubmitPage1 = document.getElementById('btn-Submit-Page1');

const personCounterEl = document.getElementById('person-Counter');

const ansFav = document.getElementById('ans-Fav');
const ansPerson = document.getElementById('ans-Person');
const btnNextPerson = document.getElementById('btn-Next-Person');

const loadingStateEl = document.getElementById('loading-state');
const resultsContainerEl = document.getElementById('results-container'); 

// State tracking for survey options
let selectedVibe = ""; 
let selectedMood = "";

// 3. Navigation: Page 1 Submit
btnSubmitPage1.addEventListener('click', (e) => {
  e.preventDefault();
    const totalPeople = parseInt(inputTotalPeople.value);
    const timeLimit = inputMaxRuntime.value.trim();
    
    if (!totalPeople || totalPeople < 1 || !timeLimit) {
        alert('Please fill in all fields correctly.');
        return;
    }
    
    state.totalPeople = totalPeople;
    state.maxRuntime = timeLimit;
    
    page1.style.display = 'none';
    page2.style.display = 'block';
    personCounterEl.textContent = `Person ${state.currentPersonIndex} of ${state.totalPeople}`;
});

// 4. Page 2: Click Event Handlers for Dynamic Choice Buttons
document.querySelectorAll('.vibe-btn').forEach(button => {
    button.addEventListener('click', (e) => { 
        document.querySelectorAll('.vibe-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active'); 
        selectedVibe = button.dataset.vibe;
    });
});

document.querySelectorAll('.mood-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    selectedMood = e.target.dataset.mood;
  });
});

// 5. Survey Loop Routing
btnNextPerson.addEventListener('click', async (e) => {
  e.preventDefault();
    const favMovieVal = ansFav.value.trim();
    const personNameVal = ansPerson.value.trim();
    
    if (!favMovieVal || !personNameVal || !selectedVibe || !selectedMood) {
        alert('Please fill in all fields and select vibe and mood.');
        return;
    }
    
    const currentPersonAnswers = {
        personNumber: state.currentPersonIndex,
        favMovie: favMovieVal,
        vibe: selectedVibe,
        mood: selectedMood,
        actor: personNameVal
    };   
    
    state.groupAnswers.push(currentPersonAnswers);
    console.log(`👤 Saved answers for Person ${state.currentPersonIndex}:`, currentPersonAnswers);

    if (state.currentPersonIndex < state.totalPeople) {
        state.currentPersonIndex++;
        resetPage2Form();
        personCounterEl.innerText = `Person ${state.currentPersonIndex} of ${state.totalPeople}`;

        if (state.currentPersonIndex === state.totalPeople) {
            btnNextPerson.innerText = "Get Recommendations";
        }
    } else {
        console.log("🎉 All users have completed the survey! Final State:", state);
        page2.style.display = 'none';
        page3.style.display = 'block';

        await fetchAndRenderRecommendations();
    }
});

function resetPage2Form() {
  ansFav.value = "";
  if (ansPerson) ansPerson.value = "";
  
  document.querySelectorAll('.vibe-btn, .mood-btn').forEach(btn => btn.classList.remove('active'));
  
  selectedVibe = "";
  selectedMood = "";
}

// 6. RAG Pipeline Initialization
let recommendedMoviesList = [];
let currentMovieDisplayIndex = 0;

async function fetchAndRenderRecommendations() {
  try {
    console.log("📡 Sending group preferences to the secure backend server...");

    const response = await fetch('http://localhost:3000/api/recommend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxRuntime: state.maxRuntime,
        groupAnswers: state.groupAnswers
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to compile recommendations.");
    }

    const matchedMovies = await response.json();

    if (!matchedMovies || matchedMovies.length === 0) {
      loadingStateEl.innerText = "😕 No movies matched your group criteria. Try adjusting your answers!";
      return;
    }

    recommendedMoviesList = matchedMovies;
    currentMovieDisplayIndex = 0;

    loadingStateEl.style.display = 'none';
    resultsContainerEl.style.display = 'flex';

    renderMovieCard(recommendedMoviesList[currentMovieDisplayIndex]);

  } catch (err) {
    console.error("💥 Frontend Pipeline Error:", err.message);
    loadingStateEl.innerHTML = `<span style="color: #ff4a4a;">Error compiling recommendations: ${err.message}</span>`;
  }
}

// 7. Dynamic UI Generation
function renderMovieCard(movieObj) {
  resultsContainerEl.innerHTML = ""; 

  const titleMatch = movieObj.content.match(/Title:\s*(.*?)\.\s*Genres:/);
  const movieTitle = titleMatch ? titleMatch[1] : "Recommended Movie";

  const yearMatch = movieObj.content.match(/Year:\s*(.*?)\.\s*Rating:/);
  const movieYear = yearMatch ? yearMatch[1] : "";

  const plotMatch = movieObj.content.match(/Plot:\s*(.*)/);
  const moviePlot = plotMatch ? plotMatch[1] : movieObj.content;
  console.log(`${movieObj.image })`); ;

  const cardHTML = `
    <div class="movie-display-layout">
      <h2 class="ui-movie-title">${movieTitle} ${movieYear ? `(${movieYear})` : ''}</h2>
      
      <div class="poster-frame">
        <img src="${movieObj.image || 'https://via.placeholder.com/300x450?text=No+Poster+Available'}" 
             alt="${movieTitle} Poster" 
             class="ui-poster-img" />
        <div class="play-button-overlay">▶</div>
      </div>

      <p class="ui-movie-plot">${moviePlot}</p>

      <button id="btn-next-movie" class="ui-next-btn">Next Movie</button>
    </div>
  `;

  resultsContainerEl.insertAdjacentHTML('beforeend', cardHTML); 

  document.getElementById('btn-next-movie').addEventListener('click', () => {
    currentMovieDisplayIndex++;
    
    if (currentMovieDisplayIndex >= recommendedMoviesList.length) {
      currentMovieDisplayIndex = 0;
    }
    
    renderMovieCard(recommendedMoviesList[currentMovieDisplayIndex]);
  });
}