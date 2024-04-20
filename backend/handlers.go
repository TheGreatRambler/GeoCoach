// handlers/round.go
package main

import (
	"net/http"
)

// RoundHandler handles the /round route
func (app *App) RoundHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		app.CreateRound(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// AssetsHandler handles the /assets/ route
func (app *App) AssetsHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "../"+r.URL.Path[1:])
}
