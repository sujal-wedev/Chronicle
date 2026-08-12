package db

import (
	"database/sql"
	"log"

	"blog-app/backend/config"

	_ "github.com/lib/pq"
)

var PG *sql.DB

func InitPostgres() {
	connStr := config.AppConfig.DatabaseURL
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/blogapp?sslmode=disable"
	}

	var err error
	PG, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening Postgres connection: %v", err)
	}

	err = PG.Ping()
	if err != nil {
		log.Fatalf("Error pinging Postgres: %v", err)
	}

	log.Println("Connected to PostgreSQL successfully.")

	// Run migrations (now with optional password column for email-based auth alongside Google OAuth)
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		google_id VARCHAR(255) UNIQUE,
		username VARCHAR(255) NOT NULL,
		email VARCHAR(255) UNIQUE NOT NULL,
		password VARCHAR(255),
		avatar_url TEXT,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = PG.Exec(createTableQuery)
	if err != nil {
		log.Fatalf("Error creating users table: %v", err)
	}
	log.Println("PostgreSQL schema validated/migrated.")
}
