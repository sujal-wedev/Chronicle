package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"

	"blog-app/backend/config"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
}

type GoogleAuthService struct {
	oauthConfig *oauth2.Config
}

var Instance *GoogleAuthService

func InitGoogleAuth(cfg *config.Config) {
	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" {
		log.Println("WARNING: Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not fully configured.")
	}

	oauthConfig := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
		},
		Endpoint: google.Endpoint,
	}

	Instance = &GoogleAuthService{
		oauthConfig: oauthConfig,
	}

	log.Println("OAuth initialized")
	log.Printf("Redirect URL: %s", cfg.GoogleRedirectURL)
}

func (s *GoogleAuthService) GetLoginURL(state string) (string, error) {
	if s.oauthConfig.ClientID == "" || s.oauthConfig.ClientSecret == "" {
		return "", errors.New("Google OAuth is not configured. Missing ClientID or ClientSecret")
	}
	if s.oauthConfig.RedirectURL == "" {
		return "", errors.New("Google OAuth redirect URL is not configured")
	}
	return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline), nil
}

func (s *GoogleAuthService) ExchangeCode(ctx context.Context, code string) (*oauth2.Token, error) {
	token, err := s.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange authorization code: %w", err)
	}
	return token, nil
}

func (s *GoogleAuthService) GetUserInfo(ctx context.Context, token *oauth2.Token) (*GoogleUserInfo, error) {
	client := s.oauthConfig.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user info, google returned status: %d", resp.StatusCode)
	}

	var userInfo GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode google user info: %w", err)
	}

	return &userInfo, nil
}

func (s *GoogleAuthService) GetUserInfoFromCode(ctx context.Context, code string) (*GoogleUserInfo, error) {
	log.Println("Token exchange started")
	token, err := s.ExchangeCode(ctx, code)
	if err != nil {
		return nil, err
	}
	log.Println("Token exchange successful")

	log.Println("Google profile retrieval started")
	userInfo, err := s.GetUserInfo(ctx, token)
	if err != nil {
		return nil, err
	}
	log.Println("Google profile retrieval successful")

	return userInfo, nil
}
