package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

func (app *App) CreateRound(w http.ResponseWriter, r *http.Request) int {
	var round Round
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&round); err != nil {
		println("Error decoding JSON: ", err.Error())
		println(r.Body)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return -1
	}
	defer r.Body.Close()

	result := app.DB.Create(&round)
	if result.Error != nil {
		http.Error(w, result.Error.Error(), http.StatusInternalServerError)
		return -2
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(round)

	return int(round.ID)
}

func downloadImageToBytes(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	buf := bytes.NewBuffer(nil)
	if _, err = io.Copy(buf, resp.Body); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func (app *App) GenerateTip(roundID uint) {
	println("MAKING TIP!")

	round := &Round{}
	app.DB.First(&round, roundID)

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		log.Fatalf("genai.NewClient: %v", err)
		return
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-pro")

	// generate tip
	prompt := []genai.Part{}

	guess_address := round.GuessAddress
	actual_address := round.RoundAddress

	prompt_text := "Can you explain to me how someone who is looking at images would confuse " +
		guess_address + ", which someone has incorrectly guessed, for " + actual_address +
		", which is what they should have guessed, and how they would differentiate them." +
		" Please answer in 3 sentences or less and give highly specific directions " +
		"regarding the actual locations mentioned. Consider that this person is likely" +
		" looking at images taken from a moving car and try to mention differences" +
		" in places that would be visible from roads. Provide an even mix of indicators " +
		"to identify the locations. Do not provide any excuses for your answers, simply get to" +
		" the point and answer the question. If you reference an uncommon word or term define it" +
		" clearly. Speak personally as if you are trying to teach someone how to identify the" +
		" second location."

	prompt = append(prompt, genai.Text(prompt_text))

	output, err := model.GenerateContent(ctx, prompt...)

	if err != nil {
		log.Fatal(err)
	}

	tip := output.Candidates[len(output.Candidates)-1].Content.Parts[len(output.Candidates[len(output.Candidates)-1].Content.Parts)-1]
	text, ok := tip.(*genai.Text)
	if !ok {
		log.Fatal("Expected tip to be text")
	}

	app.DB.Create(&Tip{
		RoundID:   roundID,
		TipString: string(*text),
		UserID:    round.UserID,
	})
}

func (app *App) CorsAndPreflightHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
}
