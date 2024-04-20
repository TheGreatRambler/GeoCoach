package main

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"gorm.io/gorm"
)

//go:embed tip_prompt.txt
var prompt_text_format string

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

	prompt_text := fmt.Sprintf(prompt_text_format, guess_address, actual_address)

	prompt = append(prompt, genai.Text(prompt_text))

	output, err := model.GenerateContent(ctx, prompt...)

	if err != nil {
		log.Fatal(err)
	}

	tip := output.Candidates[len(output.Candidates)-1].Content.Parts[len(output.Candidates[len(output.Candidates)-1].Content.Parts)-1]
	text, ok := tip.(genai.Text)
	if !ok {
		log.Fatal("Expected tip to be text")
	}

	result := app.DB.Create(&Tip{
		RoundID:   roundID,
		TipString: string(text),
		UserID:    round.UserID,
	})

	if result.Error != nil {
		log.Fatal(result.Error)
	}

	println("TIP GENERATED!")
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

func (app *App) GetTips(w http.ResponseWriter, r *http.Request) {
	println("GETTING THE TIPS")
	id := r.URL.Query().Get("round_id")

	tip := &Tip{}
	result := app.DB.Where("round_id = ?", id).First(&tip)

	println("TIP: ", tip)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			w.WriteHeader(http.StatusNotFound) // Set HTTP status to 404
			json.NewEncoder(w).Encode(map[string]string{"error": "Tip not found"})
			return
		}

		http.Error(w, result.Error.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tip)
}
