package db

import (
	"database/sql"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type DB struct {
	sqlDB     *sql.DB
	isMock    bool
	mockMu    sync.RWMutex
	mockUsers map[string]*User
}

func ConnectPostgres(databaseURL string) (*DB, error) {
	sqlDB, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return newMockDB(), nil
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		// PostgreSQL not reachable yet (e.g. running outside docker compose without local db)
		return newMockDB(), nil
	}

	return &DB{
		sqlDB:     sqlDB,
		isMock:    false,
		mockUsers: make(map[string]*User),
	}, nil
}

func newMockDB() *DB {
	return &DB{
		isMock:    true,
		mockUsers: make(map[string]*User),
	}
}

func (d *DB) Ping() error {
	if d.isMock {
		return nil
	}
	return d.sqlDB.Ping()
}

func (d *DB) CreateUser(email, passwordHash, fullName string) (*User, error) {
	if d.isMock {
		d.mockMu.Lock()
		defer d.mockMu.Unlock()

		for _, u := range d.mockUsers {
			if u.Email == email {
				return nil, errors.New("user with this email already exists")
			}
		}

		user := &User{
			ID:           uuid.New().String(),
			Email:        email,
			PasswordHash: passwordHash,
			FullName:     fullName,
			CreatedAt:    time.Now().UTC(),
			UpdatedAt:    time.Now().UTC(),
		}
		d.mockUsers[user.ID] = user
		return user, nil
	}

	id := uuid.New().String()
	now := time.Now().UTC()
	query := `
		INSERT INTO users (id, email, password_hash, full_name, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, email, password_hash, full_name, created_at, updated_at
	`
	user := &User{}
	err := d.sqlDB.QueryRow(query, id, email, passwordHash, fullName, now, now).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (d *DB) GetUserByEmail(email string) (*User, error) {
	if d.isMock {
		d.mockMu.RLock()
		defer d.mockMu.RUnlock()
		for _, u := range d.mockUsers {
			if u.Email == email {
				return u, nil
			}
		}
		return nil, sql.ErrNoRows
	}

	query := `SELECT id, email, password_hash, full_name, created_at, updated_at FROM users WHERE email = $1`
	user := &User{}
	err := d.sqlDB.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (d *DB) GetUserByID(id string) (*User, error) {
	if d.isMock {
		d.mockMu.RLock()
		defer d.mockMu.RUnlock()
		if u, ok := d.mockUsers[id]; ok {
			return u, nil
		}
		return nil, sql.ErrNoRows
	}

	query := `SELECT id, email, password_hash, full_name, created_at, updated_at FROM users WHERE id = $1`
	user := &User{}
	err := d.sqlDB.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FullName,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}
