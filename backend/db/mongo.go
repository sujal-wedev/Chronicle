package db

import (
	"context"
	"log"
	"time"

	"blog-app/backend/config"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var MongoClient *mongo.Client
var BlogsCol *mongo.Collection
var CommentsCol *mongo.Collection

func InitMongo() {
	uri := config.AppConfig.MongoDBURI
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}

	dbName := config.AppConfig.MongoDBDB
	if dbName == "" {
		dbName = "blogapp"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	MongoClient, err = mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalf("Error connecting to MongoDB: %v", err)
	}

	err = MongoClient.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("Error pinging MongoDB: %v", err)
	}

	log.Println("Connected to MongoDB successfully.")

	db := MongoClient.Database(dbName)
	BlogsCol = db.Collection("blogs")
	CommentsCol = db.Collection("comments")
}
