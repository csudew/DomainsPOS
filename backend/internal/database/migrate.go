package database

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"
)

//go:embed migrations/01_schema.sql
var schemaSQL string

//go:embed migrations/02_seed.sql
var seedSQL string

func RunMigrations(db *sql.DB) error {
	log.Println("Running database migrations...")

	if _, err := db.Exec(schemaSQL); err != nil {
		return fmt.Errorf("schema migration failed: %w", err)
	}
	log.Println("Schema migration completed")

	if _, err := db.Exec(seedSQL); err != nil {
		return fmt.Errorf("seed migration failed: %w", err)
	}
	log.Println("Seed migration completed")

	return nil
}
