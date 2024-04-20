package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func (app *App) CreateRound(w http.ResponseWriter, r *http.Request) {
	// Parse the request body
	round, err := parseRound(r)
	if err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}

	// Save the round in the database
	if err := app.DB.Create(&round).Error; err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Respond with the created round
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	fmt.Fprintf(w, `{"id":%d}`, round.ID)
}

func parseRound(r *http.Request) (*Round, error) {
	round := &Round{}
	if err := json.NewDecoder(r.Body).Decode(round); err != nil {
		return nil, err
	}
	return round, nil
}
