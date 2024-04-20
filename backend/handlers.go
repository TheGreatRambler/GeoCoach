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
		println("ID: ", id)
		if id != -1 {
			go app.GenerateTip(uint(id))
		}
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// AssetsHandler handles the /assets/ route
func (app *App) AssetsHandler(w http.ResponseWriter, r *http.Request) {
	app.CorsAndPreflightHandler(w, r)
	http.ServeFile(w, r, "../"+r.URL.Path[1:])
}
