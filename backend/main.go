package main

import (
	"log"
	"os"

	"blog-app/backend/config"
	"blog-app/backend/db"
	"blog-app/backend/handlers"
	"blog-app/backend/internal/auth"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	// Initialize configuration
	cfg := config.Load()

	port := cfg.Port

	// Initialize database clients
	db.InitPostgres()
	db.InitMongo()

	// Initialize auth & oauth credentials
	handlers.InitAuthConfig(cfg)
	auth.InitGoogleAuth(cfg)

	app := fiber.New()

	// Setup middlewares
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,http://localhost:8080,https://sujal-wedev.github.io",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Serve static files for image uploads
	app.Static("/uploads", "./uploads")

	// API Routing Group
	api := app.Group("/api")

	// Authentication Routes
	authGroup := api.Group("/auth")
	authGroup.Get("/google", handlers.HandleGoogleLogin)
	authGroup.Get("/google/login", handlers.HandleGoogleLogin)
	authGroup.Get("/google/callback", handlers.HandleGoogleCallback)
	authGroup.Post("/register", handlers.HandleRegister)
	authGroup.Post("/login", handlers.HandleLogin)
	authGroup.Get("/me", handlers.JWTProtected(), handlers.HandleGetMe)

	// Blog Post CRUD Routes
	posts := api.Group("/posts")
	posts.Get("/", handlers.HandleGetPosts)
	posts.Get("/my-posts", handlers.JWTProtected(), handlers.HandleGetMyPosts)
	posts.Get("/:id", handlers.HandleGetPostByID)
	posts.Post("/", handlers.JWTProtected(), handlers.HandleCreatePost)
	posts.Put("/:id", handlers.JWTProtected(), handlers.HandleUpdatePost)
	posts.Delete("/:id", handlers.JWTProtected(), handlers.HandleDeletePost)

	// Comments Routes
	comments := api.Group("/comments")
	comments.Get("/post/:id", handlers.HandleGetComments)
	comments.Post("/post/:id", handlers.JWTProtected(), handlers.HandleCreateComment)
	comments.Delete("/:commentId", handlers.JWTProtected(), handlers.HandleDeleteComment)

	// Image Upload Route
	api.Post("/upload", handlers.JWTProtected(), handlers.HandleImageUpload)
	// Image Proxy Route for Private Filebase S3 Objects
	api.Get("/images/:filename", handlers.HandleGetImage)

	// Serve static files (HTML, CSS, JS, etc.) from frontend/dist
	app.Static("/", "./frontend/dist")

	// Fallback route for SPA: serve index.html for any unmatched non-API routes
	app.Use(func(c *fiber.Ctx) error {
		// If the request path starts with /api or /uploads, we shouldn't serve index.html
		if len(c.Path()) >= 4 && c.Path()[:4] == "/api" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "API route not found"})
		}
		if len(c.Path()) >= 8 && c.Path()[:8] == "/uploads" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "File not found"})
		}
		// Serve the SPA main index.html
		if _, err := os.Stat("./frontend/dist/index.html"); os.IsNotExist(err) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Frontend build assets not found. Make sure to build the frontend (npm run build) first.",
			})
		}
		return c.SendFile("./frontend/dist/index.html")
	})

	log.Printf("Blogging Monolithic Server running on port %s...", port)
	log.Fatal(app.Listen(":" + port))
}
