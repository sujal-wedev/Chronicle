package handlers

import (
	"context"
	"log"
	"time"

	"blog-app/backend/db"
	"blog-app/backend/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Get all published posts
func HandleGetPosts(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"status": "published"}
	opts := options.Find().SetSort(bson.M{"created_at": -1})

	cursor, err := db.BlogsCol.Find(ctx, filter, opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer cursor.Close(ctx)

	var blogs []models.Blog
	if err = cursor.All(ctx, &blogs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if blogs == nil {
		blogs = []models.Blog{}
	}

	return c.JSON(blogs)
}

// Get logged-in user's posts (published and drafts)
func HandleGetMyPosts(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"author_id": userId}
	opts := options.Find().SetSort(bson.M{"created_at": -1})

	cursor, err := db.BlogsCol.Find(ctx, filter, opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer cursor.Close(ctx)

	var blogs []models.Blog
	if err = cursor.All(ctx, &blogs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if blogs == nil {
		blogs = []models.Blog{}
	}

	return c.JSON(blogs)
}

// Get post by ID
func HandleGetPostByID(c *fiber.Ctx) error {
	idStr := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid blog post ID"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var blog models.Blog
	err = db.BlogsCol.FindOne(ctx, bson.M{"_id": objID}).Decode(&blog)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Blog post not found"})
	}

	return c.JSON(blog)
}

// Create new post
func HandleCreatePost(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	username := c.Locals("username").(string)

	var blog models.Blog
	if err := c.BodyParser(&blog); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	blog.ID = primitive.NewObjectID()
	blog.AuthorID = userId
	blog.AuthorName = username
	blog.CreatedAt = time.Now()
	if blog.Status == "" {
		blog.Status = "draft"
	}
	if blog.Tags == nil {
		blog.Tags = []string{}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := db.BlogsCol.InsertOne(ctx, blog)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create blog post: " + err.Error()})
	}

	log.Printf("Blog created successfully: %s", blog.ID.Hex())
	return c.Status(fiber.StatusCreated).JSON(blog)
}

// Update existing post
func HandleUpdatePost(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	idStr := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid blog post ID"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find existing post to verify ownership
	var existing models.Blog
	err = db.BlogsCol.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Blog post not found"})
	}

	if existing.AuthorID != userId {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You are not authorized to edit this post"})
	}

	// Parse body changes
	var updateData models.Blog
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	updateFields := bson.M{
		"title":           updateData.Title,
		"summary":         updateData.Summary,
		"content":         updateData.Content,
		"cover_image_url": updateData.CoverImageURL,
		"tags":            updateData.Tags,
		"status":          updateData.Status,
	}

	update := bson.M{
		"$set": updateFields,
	}

	var updatedDoc models.Blog
	err = db.BlogsCol.FindOneAndUpdate(ctx, bson.M{"_id": objID}, update, options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&updatedDoc)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update blog post: " + err.Error()})
	}

	return c.JSON(updatedDoc)
}

// Delete a post
func HandleDeletePost(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	idStr := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid blog post ID"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var existing models.Blog
	err = db.BlogsCol.FindOne(ctx, bson.M{"_id": objID}).Decode(&existing)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Blog post not found"})
	}

	if existing.AuthorID != userId {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You are not authorized to delete this post"})
	}

	_, err = db.BlogsCol.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete blog post"})
	}

	// Clean up associated comments
	_, _ = db.CommentsCol.DeleteMany(ctx, bson.M{"post_id": idStr})

	return c.JSON(fiber.Map{"status": "Blog post and comments deleted successfully"})
}
