package main

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"gorm.io/gorm"
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

func (app *App) GetRounds(w http.ResponseWriter, r *http.Request) {
	rounds := []Round{}
	var result *gorm.DB
	user_id := r.URL.Query().Get("user_id")

	if user_id != "" {
		result = app.DB.Where("user_id = ?", user_id).Find(&rounds)
	} else {
		result = app.DB.Find(&rounds)
	}

	if result.Error != nil {
		http.Error(w, result.Error.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(rounds)

}

func downloadUrl(req *http.Request) ([]byte, error) {
	client := http.Client{}
	resp, err := client.Do(req)
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

func getGoogleMapsClientID() (string, error) {
	req, _ := http.NewRequest("GET", "https://www.google.com/maps", nil)
	homepage, err := downloadUrl(req)
	if err != nil {
		log.Fatalf("genai.NewClient: %v", err)
		return "", err
	}

	findStr := "\"],null,0,\""
	startID := strings.Index(string(homepage), findStr)
	if startID == -1 {
		return "", fmt.Errorf("Could not find Google Maps client ID")
	}

	endQuote := strings.Index(string(homepage)[startID+len(findStr):], "\"")
	if endQuote == -1 {
		return "", fmt.Errorf("Could not find Google Maps client ID")
	}

	endQuote += startID + len(findStr)

	return string(homepage)[startID+len(findStr) : endQuote], nil
}
