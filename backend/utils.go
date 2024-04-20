package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

func (app *App) CreateRound(w http.ResponseWriter, r *http.Request) {
	var round Round
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&round); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	result := app.DB.Create(&round)
	if result.Error != nil {
		http.Error(w, result.Error.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(round)

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

func (app *App) GenerateTip(roundID uint, urls []string) {
	round := &Round{}
	app.DB.First(&round, roundID)

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("API_KEY")))
	if err != nil {
		log.Fatalf("genai.NewClient: %v", err)
		return
	}
	defer client.Close()

	// model := client.GenerativeModel("gemini-pro-vision")

	// download images
	var wg sync.WaitGroup
	var mutex sync.Mutex
	imagesBytes := make([][]byte, 0)

	for _, url := range urls {
		wg.Add(1)
		go func(url string) {
			defer wg.Done()
			imgBytes, err := downloadImageToBytes(url)
			if err != nil {
				println("Failed to download", url, ":", err)
			} else {
				mutex.Lock()
				imagesBytes = append(imagesBytes, imgBytes)
				mutex.Unlock()
				println("Downloaded and stored in memory:", url)
			}
		}(url)
	}
	wg.Wait() // Wait for all downloads to finish

	// generate tip
	prompt := []genai.Part{}

	for _, image := range imagesBytes {
		prompt = append(prompt, genai.ImageData("png", image))
	}

	prompt = append(prompt, genai.Text("Generate a tip for this location."))

	// output, err := model.GenerateContent(ctx, prompt...)

	// if err != nil {
	// 	log.Fatal(err)
	// }

	// // Save the tip in the database
	// app.DB.Create(&Tip{
	// 	RoundID:   roundID,
	// 	TipString: output,
	// 	UserID:    round.UserID,
	// })
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
