package main

import (
	"gorm.io/gorm"
)

type App struct {
	DB *gorm.DB
}

type Round struct {
	gorm.Model
	RoundLat float64 `gorm:"type:decimal(10,8);not null"`
	RoundLon float64 `gorm:"type:decimal(11,8);not null"`
	GuessLat float64 `gorm:"type:decimal(10,8);not null"`
	GuessLon float64 `gorm:"type:decimal(11,8);not null"`
	Score    int     `gorm:"type:integer;not null"`
	UserID   string  `gorm:"type:varchar(100);not null"`
}
