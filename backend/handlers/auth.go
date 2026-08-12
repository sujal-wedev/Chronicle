package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"blog-app/backend/config"
	"blog-app/backend/db"
	"blog-app/backend/internal/auth"
	"blog-app/backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	JWTSecret         []byte
)

func InitAuthConfig(cfg *config.Config) {
	secret := cfg.JWTSecret
	JWTSecret = []byte(secret)
}

// Generate JWT token for user
func GenerateJWT(user models.User) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       user.ID,
		"email":    user.Email,
		"username": user.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})

	return token.SignedString(JWTSecret)
}

// JWT Middleware for Fiber
func JWTProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing Authorization header"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid Authorization header format"})
		}

		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return JWTSecret, nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
		}

		// Save claims to context
		c.Locals("userId", int(claims["id"].(float64)))
		c.Locals("email", claims["email"].(string))
		c.Locals("username", claims["username"].(string))

		return c.Next()
	}
}

// Redirects user to Google OAuth page
func HandleGoogleLogin(c *fiber.Ctx) error {
	log.Println("OAuth login started")
	url, err := auth.Instance.GetLoginURL("state-token")
	if err != nil {
		log.Printf("OAuth login failed to initialize: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Redirect(url)
}

// Handles the Google OAuth callback
func HandleGoogleCallback(c *fiber.Ctx) error {
	log.Println("OAuth callback received")

	// Validate state
	state := c.Query("state")
	if state != "state-token" {
		log.Println("OAuth callback failed: invalid state token")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid state token"})
	}

	code := c.Query("code")
	if code == "" {
		log.Println("OAuth callback failed: missing code parameter")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Code parameter is required"})
	}

	// Fetch user details from Google using the code (internally exchanges code and fetches info)
	googleUser, err := auth.Instance.GetUserInfoFromCode(c.Context(), code)
	if err != nil {
		log.Printf("OAuth callback failed to retrieve user info: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	log.Printf("User authenticated: %s", googleUser.Email)

	// Upsert user in Postgres
	var dbUser models.User
	query := `SELECT id, COALESCE(google_id, ''), username, email, COALESCE(avatar_url, ''), created_at FROM users WHERE email = $1`
	err = db.PG.QueryRow(query, googleUser.Email).Scan(&dbUser.ID, &dbUser.GoogleID, &dbUser.Username, &dbUser.Email, &dbUser.AvatarURL, &dbUser.CreatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			// Insert new user
			insertQuery := `
			INSERT INTO users (google_id, username, email, avatar_url)
			VALUES ($1, $2, $3, $4)
			RETURNING id, google_id, username, email, avatar_url, created_at`
			err = db.PG.QueryRow(insertQuery, googleUser.ID, googleUser.Name, googleUser.Email, googleUser.Picture).
				Scan(&dbUser.ID, &dbUser.GoogleID, &dbUser.Username, &dbUser.Email, &dbUser.AvatarURL, &dbUser.CreatedAt)
			if err != nil {
				log.Printf("OAuth callback database registration failed: %v", err)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to register user: " + err.Error()})
			}
		} else {
			log.Printf("OAuth callback database lookup failed: %v", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database error: " + err.Error()})
		}
	} else {
		// Update existing user with google info
		updateQuery := `UPDATE users SET google_id = $1, avatar_url = $2 WHERE id = $3`
		_, _ = db.PG.Exec(updateQuery, googleUser.ID, googleUser.Picture, dbUser.ID)
		dbUser.GoogleID = googleUser.ID
		dbUser.AvatarURL = googleUser.Picture
	}

	// Generate JWT
	jwtToken, err := GenerateJWT(dbUser)
	if err != nil {
		log.Printf("OAuth callback JWT generation failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to sign JWT token"})
	}

	log.Printf("User authenticated successfully: %s", dbUser.Email)

	// Redirect to frontend
	frontendURL := config.AppConfig.FrontendURL
	if frontendURL == "" {
		// If running in unified mode (single port), redirect relatively to same host
		log.Printf("Google callback successful, redirecting relatively to: /auth?token=...")
		return c.Redirect(fmt.Sprintf("/auth?token=%s", jwtToken))
	}
	log.Printf("Google callback successful, redirecting to: %s/auth?token=...", frontendURL)
	return c.Redirect(fmt.Sprintf("%s/auth?token=%s", frontendURL, jwtToken))
}

// Get user profile info
func HandleGetMe(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	var dbUser models.User
	query := `SELECT id, username, email, COALESCE(avatar_url, ''), created_at FROM users WHERE id = $1`
	err := db.PG.QueryRow(query, userId).Scan(&dbUser.ID, &dbUser.Username, &dbUser.Email, &dbUser.AvatarURL, &dbUser.CreatedAt)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(fiber.Map{"user": dbUser})
}

// Handle Register with username/email/password
func HandleRegister(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if body.Username == "" || body.Email == "" || body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "All fields are required"})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	var dbUser models.User
	insertQuery := `
	INSERT INTO users (username, email, password)
	VALUES ($1, $2, $3)
	RETURNING id, username, email, created_at`
	err = db.PG.QueryRow(insertQuery, body.Username, body.Email, string(hashedPassword)).
		Scan(&dbUser.ID, &dbUser.Username, &dbUser.Email, &dbUser.CreatedAt)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email or Username already exists"})
	}

	jwtToken, err := GenerateJWT(dbUser)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"token": jwtToken,
		"user":  dbUser,
	})
}

// Handle Login with email/password
func HandleLogin(c *fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	var dbUser models.User
	var passwordHash sql.NullString
	query := `SELECT id, username, email, password, COALESCE(avatar_url, ''), created_at FROM users WHERE email = $1`
	err := db.PG.QueryRow(query, body.Email).Scan(&dbUser.ID, &dbUser.Username, &dbUser.Email, &passwordHash, &dbUser.AvatarURL, &dbUser.CreatedAt)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	if !passwordHash.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "This account uses Google Login. Please sign in with Google."})
	}

	err = bcrypt.CompareHashAndPassword([]byte(passwordHash.String), []byte(body.Password))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid email or password"})
	}

	jwtToken, err := GenerateJWT(dbUser)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"token": jwtToken,
		"user":  dbUser,
	})
}
