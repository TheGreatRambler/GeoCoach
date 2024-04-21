package main

import (
	"bufio"
	"bytes"
	"context"
	_ "embed"
	"encoding/base64"
	"encoding/json"
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
)

//go:embed tip_prompt.txt
var prompt_text_format string

func IntPow(n, m int) int {
	if m == 0 {
		return 1
	}

	if m == 1 {
		return n
	}

	result := n
	for i := 2; i <= m; i++ {
		result *= n
	}
	return result
}

func DownloadPanorama(panorama_id string) (*bytes.Buffer, error) {
	zoom := 3
	width := 6656 / (IntPow(2, 4-zoom))
	height := 6656 / (IntPow(2, 5-zoom))
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
				return nil, err
			}

			tile, _, err := image.Decode(bytes.NewReader(tileBytes))
			if err != nil {
				log.Fatalf("genai.NewClient: %v", err)
				return nil, err
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
	err := jpeg.Encode(panoramaBuf, panoramaImage, &jpeg.Options{Quality: 85})
	if err != nil {
		return nil, err
	}

	return panoramaBuf, nil
}

func DownloadPanoramaFromLocation(lat float64, lon float64) (*bytes.Buffer, error) {
	client_id, err := getGoogleMapsClientID()
	if err != nil {
		log.Fatalf("genai.NewClient: %v", err)
		return nil, err
	}

	req, _ := http.NewRequest("GET", fmt.Sprintf("https://www.google.com/maps/rpc/photo/listentityphotos?authuser=0&hl=en&gl=us&pb=!1e3!5m54!2m2!1i203!2i100!3m3!2i%d!3s%s!5b1!7m42!1m3!1e1!2b0!3e3!1m3!1e2!2b1!3e2!1m3!1e2!2b0!3e3!1m3!1e8!2b0!3e3!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e9!2b1!3e2!1m3!1e10!2b0!3e3!1m3!1e10!2b1!3e2!1m3!1e10!2b0!3e4!2b1!4b1!8m0!9b0!11m1!4b1!6m3!1s%s!7e81!15i11021!9m2!2d%f!3d%f!10d%f", 1, "CAEIBAgFCAYgAQ", client_id, lon, lat, 100.0), nil)
	panoramaListJson, err := downloadUrl(req)

	var panoramaList []interface{}
	err = json.Unmarshal(panoramaListJson[5:], &panoramaList)
	if err != nil {
		log.Fatalf("genai.NewClient: %v", err)
		return nil, err
	}

	panorama_id := panoramaList[3].(string)

	zoom := 3
	width := 6656 / (IntPow(2, 4-zoom))
	height := 6656 / (IntPow(2, 5-zoom))
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
				return nil, err
			}

			tile, _, err := image.Decode(bytes.NewReader(tileBytes))
			if err != nil {
				log.Fatalf("genai.NewClient: %v", err)
				return nil, err
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
		return nil, err
	}

	return panoramaBuf, nil
}

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

	DownloadPanoramaFromLocation(round.GuessLat, round.GuessLon)

	// Actual location panorama
	panoramaBuf, err := DownloadPanorama(round.PanoramaID)
	if err != nil {
		log.Fatalf("genai.NewClient: %v", err)
		return
	}

	filename := strings.ToLower(strings.ReplaceAll(base64.StdEncoding.EncodeToString([]byte(round.PanoramaID)), "=", ""))
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
		TipString: strings.ReplaceAll(string(text), "* ", ""),
		UserID:    round.UserID,
	})

	if result.Error != nil {
		log.Fatal(result.Error)
	}
}

func (app *App) GetTips(w http.ResponseWriter, r *http.Request) {

	// make results array
	results := []Tip{}

	if r.URL.Query().Get("round_id") != "" {
		rid := r.URL.Query().Get("round_id")
		app.DB.Where("round_id = ?", rid).Find(&results)
	} else if r.URL.Query().Get("user_id") != "" {
		uid := r.URL.Query().Get("user_id")
		app.DB.Where("user_id = ?", uid).Find(&results)
	} else {
		app.DB.Find(&results)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
