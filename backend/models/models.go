package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID        int       `json:"id" db:"id"`
	GoogleID  string    `json:"google_id" db:"google_id"`
	Username  string    `json:"username" db:"username"`
	Email     string    `json:"email" db:"email"`
	AvatarURL string    `json:"avatar_url" db:"avatar_url"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type Blog struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Title         string             `json:"title" bson:"title"`
	Summary       string             `json:"summary" bson:"summary"`
	Content       string             `json:"content" bson:"content"`
	CoverImageURL string             `json:"cover_image_url" bson:"cover_image_url"`
	Tags          []string           `json:"tags" bson:"tags"`
	Status        string             `json:"status" bson:"status"` // "draft" or "published"
	AuthorID      int                `json:"author_id" bson:"author_id"`
	AuthorName    string             `json:"author_name" bson:"author_name"`
	CreatedAt     time.Time          `json:"created_at" bson:"created_at"`
}

type Comment struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	PostID     string             `json:"post_id" bson:"post_id"`
	UserID     int                `json:"user_id" bson:"user_id"`
	AuthorName string             `json:"author_name" bson:"author_name"`
	Content    string             `json:"content" bson:"content"`
	CreatedAt  time.Time          `json:"created_at" bson:"created_at"`
}
