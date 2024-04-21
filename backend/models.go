package main

import (
	"gorm.io/gorm"
)

type App struct {
	DB *gorm.DB
}

type Round struct {
	gorm.Model
	RoundLat     float64 `gorm:"type:decimal(10,8);not null"`
	RoundLon     float64 `gorm:"type:decimal(11,8);not null"`
	RoundAddress string  `gorm:"type:varchar(1000);not null"`
	GuessLat     float64 `gorm:"type:decimal(10,8);not null"`
	GuessLon     float64 `gorm:"type:decimal(11,8);not null"`
	GuessAddress string  `gorm:"type:varchar(1000);not null"`
	Score        int     `gorm:"type:integer;not null"`
	UserID       string  `gorm:"type:varchar(100);not null"`
	PanoramaID   string  `gorm:"type:varchar(100);not null"`
}

type Tip struct {
	gorm.Model
	RoundID   uint   `gorm:"type:integer;not null;foreignkey:RoundID"`
	TipString string `gorm:"type:varchar(1000);not null"`
	UserID    string `gorm:"type:varchar(100);not null"`
}

type ListEntityPhotos struct {
	PanoramaID string `json:""`
}

type Concept struct {
	gorm.Model
	RoundID uint   `gorm:"type:integer;not null;foreignkey:RoundID"`
	Concept string `gorm:"type:varchar(100);not null"`
	UserID  string `gorm:"type:varchar(100);not null"`
}
