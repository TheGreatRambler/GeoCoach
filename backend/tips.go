package main

import (
	"bufio"
	"bytes"
	"context"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"log"
	"math"
	"net/http"
	"os"
	"strings"

	"github.com/fogleman/gg"

	"github.com/disintegration/imaging"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"gorm.io/gorm"
)

func (app *App) GenerateTip(roundID uint) {
	round := &Round{}
	app.DB.First(&round, roundID)

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		log.Fatalf("genai.NewClient: %v", err)
		return
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-pro-vision")

	// generate tip
	prompt := []genai.Part{}

	guess_address := round.GuessAddress
	actual_address := round.RoundAddress
	panorama_id := round.PanoramaID

	// Obtain equirectangular image
	//client_id, err := getGoogleMapsClientID()
	//if err != nil {
	//	log.Fatalf("genai.NewClient: %v", err)
	//	return
	//}

	//zoom := 5
	//width := 13312
	//height := 6656
	zoom := 4
	width := 6656
	height := 3328
	tiles_width := int(math.Ceil(float64(width) / 512))
	tiles_height := int(math.Ceil(float64(height) / 512))

	panoramaImage := image.NewRGBA(image.Rectangle{image.Point{0, 0}, image.Point{width, height}})
	panoramaImageCtx := gg.NewContextForRGBA(panoramaImage)
	panoramaImageCtx.SetRGB(1, 1, 1)

	for x := 0; x < tiles_width; x++ {
		for y := 0; y < tiles_height; y++ {
			req, _ := http.NewRequest("GET", fmt.Sprintf("https://streetviewpixels-pa.googleapis.com/v1/tile?cb_client=maps_sv.tactile&panoid=%s&x=%d&y=%d&zoom=%d&nbt=1&fover=2", panorama_id, x, y, zoom), nil)
			req.Header = http.Header{
				"Accept":                    {"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"},
				"Accept-Encoding":           {"en-US,en;q=0.5"},
				"Accept-Language":           {"en-US,en;q=0.5"},
				"Alt-Used":                  {"streetviewpixels-pa.googleapis.com"},
				"Connection":                {"keep-alive"},
				"Host":                      {"streetviewpixels-pa.googleapis.com"},
				"Sec-Fetch-Dest":            {"document"},
				"Sec-Fetch-Mode":            {"navigate"},
				"Sec-Fetch-Site":            {"none"},
				"Sec-Fetch-User":            {"?1"},
				"TE":                        {"trailers"},
				"Upgrade-Insecure-Requests": {"1"},
				"User-Agent":                {"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/111.0"},
			}
			tileBytes, err := downloadUrl(req)
			if err != nil {
				log.Fatalf("genai.NewClient: %v", err)
				return
			}

			tile, _, err := image.Decode(bytes.NewReader(tileBytes))
			if err != nil {
				log.Fatalf("genai.NewClient: %v", err)
				return
			}

			if zoom == 5 && (y < 4 || tiles_height-y-1 < 4) {
				// Blow up image
				tileResized := imaging.Resize(tile, 512, 512, imaging.Lanczos)
				panoramaImageCtx.DrawImage(tileResized, x*512, y*512)
			} else {
				panoramaImageCtx.DrawImage(tile, x*512, y*512)
			}
		}
	}

	panoramaBuf := &bytes.Buffer{}
	err = jpeg.Encode(panoramaBuf, panoramaImage, &jpeg.Options{Quality: 85})
	if err != nil {
		log.Fatal(err)
	}

	filename := strings.ToLower(strings.ReplaceAll(base64.StdEncoding.EncodeToString([]byte(panorama_id)), "=", ""))
	file, err := client.UploadFile(ctx, filename, bufio.NewReader(panoramaBuf), &genai.UploadFileOptions{DisplayName: "Equirectangular panorama of actual location"})
	if err != nil {
		log.Fatal(err)
	}

	prompt_text := fmt.Sprintf(prompt_text_format, guess_address, actual_address)

	prompt = append(prompt, genai.Text(prompt_text))
	prompt = append(prompt, genai.FileData{
		MIMEType: "image/jpeg",
		URI:      file.URI,
	})

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
}

func (app *App) GetTips(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("round_id")

	tip := &Tip{}
	result := app.DB.Where("round_id = ?", id).First(&tip)

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
