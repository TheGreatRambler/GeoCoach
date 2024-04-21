package main

import (
	"log"
	"net/http"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&Round{})
	db.AutoMigrate(&Tip{})
	db.AutoMigrate(&Concept{})

	app := &App{DB: db}

	http.HandleFunc("/rounds", app.RoundHandler)
	http.HandleFunc("/tips", app.TipsHander)
	http.HandleFunc("/concepts", app.ConceptsHander)
	http.HandleFunc("/assets/", app.AssetsHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
