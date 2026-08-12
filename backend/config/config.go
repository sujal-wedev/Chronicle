package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DatabaseURL        string
	MongoDBURI         string
	MongoDBDB          string
	JWTSecret          string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	FrontendURL        string
	FilebaseAccessKey string
	FilebaseSecretKey string
	FilebaseBucket    string
	FilebaseEndpoint  string
}

var AppConfig *Config

func Load() *Config {
	// Try loading .env from current working directory
	if err := godotenv.Load(); err != nil {
		// Fallback: try loading from parent directory (useful if run from inside backend/)
		_ = godotenv.Load("../.env")
	}

	AppConfig = &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		MongoDBURI:         getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDBDB:          getEnv("MONGODB_DB", "blogapp"),
		JWTSecret:          getEnv("JWT_SECRET", "super-secret-key-change-me-in-production"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", ""),
		FrontendURL:        getEnv("FRONTEND_URL", ""),
		FilebaseAccessKey: getEnv("FILEBASE_ACCESS_KEY", ""),
		FilebaseSecretKey: getEnv("FILEBASE_SECRET_KEY", ""),
		FilebaseBucket:    getEnv("FILEBASE_BUCKET", "blogger"),
		FilebaseEndpoint:  getEnv("FILEBASE_ENDPOINT", "https://s3.filebase.io"),
	}

	log.Println("Configuration loaded successfully")
	if AppConfig.GoogleRedirectURL != "" {
		log.Printf("OAuth Redirect URL configured: %s", AppConfig.GoogleRedirectURL)
	} else {
		log.Println("WARNING: GOOGLE_REDIRECT_URL is not set!")
	}

	return AppConfig
}

func getEnv(key, defaultVal string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultVal
}
