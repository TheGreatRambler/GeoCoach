package main

import (
	"log"
	"net/http"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	db.AutoMigrate(&Round{})
	db.AutoMigrate(&Tip{})

	app := &App{DB: db}

	http.HandleFunc("/rounds", app.RoundHandler)
	http.HandleFunc("/assets/", app.AssetsHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
