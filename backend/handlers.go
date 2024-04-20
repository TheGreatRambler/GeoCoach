// handlers/round.go
package main

import (
	"net/http"
)

// RoundHandler handles the /round route
func (app *App) RoundHandler(w http.ResponseWriter, r *http.Request) {
	app.CorsAndPreflightHandler(w, r)
	switch r.Method {
	case http.MethodPost:
		id := app.CreateRound(w, r)
		if id != -1 {
			go app.GenerateTip(uint(id))
		}
	case http.MethodGet:
		app.GetRounds(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (app *App) TipsHander(w http.ResponseWriter, r *http.Request) {
	app.CorsAndPreflightHandler(w, r)
	switch r.Method {
	case http.MethodGet:
		app.GetTips(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// AssetsHandler handles the /assets/ route
func (app *App) AssetsHandler(w http.ResponseWriter, r *http.Request) {
	app.CorsAndPreflightHandler(w, r)
	http.ServeFile(w, r, "../"+r.URL.Path[1:])
}
