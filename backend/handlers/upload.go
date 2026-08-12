package handlers

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"blog-app/backend/config"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/gofiber/fiber/v2"
)

// HandleImageUpload uploads the file to the private Filebase S3 bucket
func HandleImageUpload(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file uploaded"})
	}

	// Open the uploaded file stream
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open file"})
	}
	defer file.Close()

	// Read file contents into buffer
	buffer := make([]byte, fileHeader.Size)
	if _, err := file.Read(buffer); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read file content"})
	}

	// Ensure configurations are loaded
	cfg := config.AppConfig
	if cfg == nil {
		cfg = config.Load()
	}

	// Initialize Filebase S3 Config with static credentials
	s3Config := &aws.Config{
		Credentials:      credentials.NewStaticCredentials(cfg.FilebaseAccessKey, cfg.FilebaseSecretKey, ""),
		Endpoint:         aws.String(cfg.FilebaseEndpoint),
		Region:           aws.String("auto"),
		S3ForcePathStyle: aws.Bool(true),
	}

	sess, err := session.NewSession(s3Config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize storage session: " + err.Error()})
	}

	svc := s3.New(sess)

	// Create unique filename key to prevent conflicts
	filename := fmt.Sprintf("%d-%s", time.Now().UnixNano(), fileHeader.Filename)
	contentType := http.DetectContentType(buffer) // Detect content type (image/png, image/jpeg, etc.)

	// Upload object to Filebase bucket (retains S3 Private status)
	uploadInput := &s3.PutObjectInput{
		Bucket:      aws.String(cfg.FilebaseBucket),
		Key:         aws.String(filename),
		Body:        bytes.NewReader(buffer),
		ContentType: aws.String(contentType),
	}

	_, err = svc.PutObject(uploadInput)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to upload to object storage: " + err.Error()})
	}

	// Return a secure proxy URL routed through our backend
	proxyURL := fmt.Sprintf("/api/images/%s", filename)

	return c.JSON(fiber.Map{"url": proxyURL})
}

// HandleGetImage acts as an authenticated proxy to fetch private images from Filebase
func HandleGetImage(c *fiber.Ctx) error {
	filename := c.Params("filename")
	if filename == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Filename is required"})
	}

	cfg := config.AppConfig
	if cfg == nil {
		cfg = config.Load()
	}

	// Initialize Filebase S3 session
	s3Config := &aws.Config{
		Credentials:      credentials.NewStaticCredentials(cfg.FilebaseAccessKey, cfg.FilebaseSecretKey, ""),
		Endpoint:         aws.String(cfg.FilebaseEndpoint),
		Region:           aws.String("auto"),
		S3ForcePathStyle: aws.Bool(true),
	}

	sess, err := session.NewSession(s3Config)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize storage session"})
	}

	svc := s3.New(sess)

	// Retrieve file from private Filebase bucket
	resp, err := svc.GetObject(&s3.GetObjectInput{
		Bucket: aws.String(cfg.FilebaseBucket),
		Key:    aws.String(filename),
	})
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Image not found or access denied"})
	}
	defer resp.Body.Close()

	// Read object body bytes
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read image data"})
	}

	// Set content-type header
	if resp.ContentType != nil {
		c.Set("Content-Type", *resp.ContentType)
	} else {
		c.Set("Content-Type", "application/octet-stream")
	}

	// Optimize loading by caching images in browser for 30 days
	c.Set("Cache-Control", "public, max-age=2592000")

	// Send raw bytes to client
	return c.Send(data)
}
