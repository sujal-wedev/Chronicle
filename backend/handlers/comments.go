package handlers

import (
	"context"
	"time"

	"blog-app/backend/db"
	"blog-app/backend/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Get comments for a specific post
func HandleGetComments(c *fiber.Ctx) error {
	postID := c.Params("id")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"post_id": postID}
	opts := options.Find().SetSort(bson.M{"created_at": -1})

	cursor, err := db.CommentsCol.Find(ctx, filter, opts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer cursor.Close(ctx)

	var comments []models.Comment
	if err = cursor.All(ctx, &comments); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if comments == nil {
		comments = []models.Comment{}
	}

	return c.JSON(comments)
}

// Add a comment to a post
func HandleCreateComment(c *fiber.Ctx) error {
	postID := c.Params("id")
	userId := c.Locals("userId").(int)
	username := c.Locals("username").(string)

	var comment models.Comment
	if err := c.BodyParser(&comment); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	comment.ID = primitive.NewObjectID()
	comment.PostID = postID
	comment.UserID = userId
	comment.AuthorName = username
	comment.CreatedAt = time.Now()

	if comment.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Comment content cannot be empty"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := db.CommentsCol.InsertOne(ctx, comment)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to post comment"})
	}

	return c.Status(fiber.StatusCreated).JSON(comment)
}

// Delete a comment
func HandleDeleteComment(c *fiber.Ctx) error {
	userId := c.Locals("userId").(int)
	commentIdStr := c.Params("commentId")

	commentObjID, err := primitive.ObjectIDFromHex(commentIdStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid comment ID"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find comment
	var comment models.Comment
	err = db.CommentsCol.FindOne(ctx, bson.M{"_id": commentObjID}).Decode(&comment)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Comment not found"})
	}

	// Fetch blog post to see who is the author
	postObjID, err := primitive.ObjectIDFromHex(comment.PostID)
	var isPostAuthor bool
	if err == nil {
		var blog models.Blog
		err = db.BlogsCol.FindOne(ctx, bson.M{"_id": postObjID}).Decode(&blog)
		if err == nil && blog.AuthorID == userId {
			isPostAuthor = true
		}
	}

	// Verify permissions: user must be the comment author OR the post author
	if comment.UserID != userId && !isPostAuthor {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "You are not authorized to delete this comment"})
	}

	_, err = db.CommentsCol.DeleteOne(ctx, bson.M{"_id": commentObjID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete comment"})
	}

	return c.JSON(fiber.Map{"status": "Comment deleted successfully"})
}
