package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"

	"pos-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type LoyaltyHandler struct {
	db *sql.DB
}

func NewLoyaltyHandler(db *sql.DB) *LoyaltyHandler {
	return &LoyaltyHandler{db: db}
}

// GetTiers returns all loyalty tiers ordered by sort_order
func (h *LoyaltyHandler) GetTiers(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT id, name, min_points, discount_percent, points_per_dollar, color, sort_order, created_at, updated_at
		FROM loyalty_tiers ORDER BY sort_order ASC, min_points ASC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch tiers", Error: stringPtr(err.Error())})
		return
	}
	defer rows.Close()

	tiers := []models.LoyaltyTier{}
	for rows.Next() {
		var t models.LoyaltyTier
		if err := rows.Scan(&t.ID, &t.Name, &t.MinPoints, &t.DiscountPercent, &t.PointsPerDollar, &t.Color, &t.SortOrder, &t.CreatedAt, &t.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to scan tier", Error: stringPtr(err.Error())})
			return
		}
		tiers = append(tiers, t)
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Tiers retrieved", Data: tiers})
}

// CreateTier creates a new loyalty tier
func (h *LoyaltyHandler) CreateTier(c *gin.Context) {
	var req struct {
		Name            string  `json:"name" binding:"required"`
		MinPoints       int     `json:"min_points"`
		DiscountPercent float64 `json:"discount_percent"`
		PointsPerDollar float64 `json:"points_per_dollar"`
		Color           string  `json:"color"`
		SortOrder       int     `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: stringPtr(err.Error())})
		return
	}
	if req.Color == "" {
		req.Color = "#6B7280"
	}
	if req.PointsPerDollar == 0 {
		req.PointsPerDollar = 1.0
	}

	var tier models.LoyaltyTier
	err := h.db.QueryRow(
		`INSERT INTO loyalty_tiers (id, name, min_points, discount_percent, points_per_dollar, color, sort_order)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, name, min_points, discount_percent, points_per_dollar, color, sort_order, created_at, updated_at`,
		uuid.New(), req.Name, req.MinPoints, req.DiscountPercent, req.PointsPerDollar, req.Color, req.SortOrder,
	).Scan(&tier.ID, &tier.Name, &tier.MinPoints, &tier.DiscountPercent, &tier.PointsPerDollar, &tier.Color, &tier.SortOrder, &tier.CreatedAt, &tier.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to create tier", Error: stringPtr(err.Error())})
		return
	}
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Message: "Tier created", Data: tier})
}

// UpdateTier updates a loyalty tier
func (h *LoyaltyHandler) UpdateTier(c *gin.Context) {
	tierID := c.Param("id")
	var req struct {
		Name            string  `json:"name" binding:"required"`
		MinPoints       int     `json:"min_points"`
		DiscountPercent float64 `json:"discount_percent"`
		PointsPerDollar float64 `json:"points_per_dollar"`
		Color           string  `json:"color"`
		SortOrder       int     `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: stringPtr(err.Error())})
		return
	}
	if req.Color == "" {
		req.Color = "#6B7280"
	}

	var tier models.LoyaltyTier
	err := h.db.QueryRow(
		`UPDATE loyalty_tiers
		 SET name=$1, min_points=$2, discount_percent=$3, points_per_dollar=$4, color=$5, sort_order=$6, updated_at=CURRENT_TIMESTAMP
		 WHERE id=$7
		 RETURNING id, name, min_points, discount_percent, points_per_dollar, color, sort_order, created_at, updated_at`,
		req.Name, req.MinPoints, req.DiscountPercent, req.PointsPerDollar, req.Color, req.SortOrder, tierID,
	).Scan(&tier.ID, &tier.Name, &tier.MinPoints, &tier.DiscountPercent, &tier.PointsPerDollar, &tier.Color, &tier.SortOrder, &tier.CreatedAt, &tier.UpdatedAt)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Tier not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to update tier", Error: stringPtr(err.Error())})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Tier updated", Data: tier})
}

// DeleteTier deletes a loyalty tier (unassigns customers first)
func (h *LoyaltyHandler) DeleteTier(c *gin.Context) {
	tierID := c.Param("id")
	h.db.Exec("UPDATE loyalty_customers SET tier_id = NULL WHERE tier_id = $1", tierID)
	result, err := h.db.Exec("DELETE FROM loyalty_tiers WHERE id = $1", tierID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to delete tier", Error: stringPtr(err.Error())})
		return
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Tier not found"})
		return
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Tier deleted"})
}

// GetCustomers returns all loyalty customers with pagination
func (h *LoyaltyHandler) GetCustomers(c *gin.Context) {
	page, perPage := 1, 20
	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	search := c.Query("search")

	countQuery := "SELECT COUNT(*) FROM loyalty_customers"
	args := []interface{}{}
	if search != "" {
		countQuery += " WHERE phone ILIKE $1 OR name ILIKE $1"
		args = append(args, "%"+search+"%")
	}
	var total int
	h.db.QueryRow(countQuery, args...).Scan(&total)

	offset := (page - 1) * perPage
	dataQuery := `
		SELECT lc.id, lc.phone, lc.name, lc.total_points, lc.lifetime_spent, lc.created_at, lc.updated_at,
		       lt.id, lt.name, lt.min_points, lt.discount_percent, lt.points_per_dollar, lt.color
		FROM loyalty_customers lc
		LEFT JOIN loyalty_tiers lt ON lc.tier_id = lt.id`
	if search != "" {
		dataQuery += " WHERE lc.phone ILIKE $1 OR lc.name ILIKE $1"
		dataQuery += fmt.Sprintf(" ORDER BY lc.total_points DESC LIMIT $2 OFFSET $3")
		args = append(args, perPage, offset)
	} else {
		dataQuery += fmt.Sprintf(" ORDER BY lc.total_points DESC LIMIT $1 OFFSET $2")
		args = []interface{}{perPage, offset}
	}

	rows, err := h.db.Query(dataQuery, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch customers", Error: stringPtr(err.Error())})
		return
	}
	defer rows.Close()

	customers := []models.LoyaltyCustomer{}
	for rows.Next() {
		var cust models.LoyaltyCustomer
		var custName sql.NullString
		var tierID, tierName, tierColor sql.NullString
		var tierMinPoints sql.NullInt64
		var tierDiscount, tierPoints sql.NullFloat64

		err := rows.Scan(
			&cust.ID, &cust.Phone, &custName, &cust.TotalPoints, &cust.LifetimeSpent, &cust.CreatedAt, &cust.UpdatedAt,
			&tierID, &tierName, &tierMinPoints, &tierDiscount, &tierPoints, &tierColor,
		)
		if err != nil {
			continue
		}
		if custName.Valid {
			cust.Name = &custName.String
		}
		if tierID.Valid {
			id, _ := uuid.Parse(tierID.String)
			cust.TierID = &id
			cust.Tier = &models.LoyaltyTier{
				ID: id, Name: tierName.String, MinPoints: int(tierMinPoints.Int64),
				DiscountPercent: tierDiscount.Float64, PointsPerDollar: tierPoints.Float64, Color: tierColor.String,
			}
		}
		customers = append(customers, cust)
	}

	totalPages := (total + perPage - 1) / perPage
	c.JSON(http.StatusOK, models.PaginatedResponse{
		Success: true, Message: "Customers retrieved", Data: customers,
		Meta: models.MetaData{CurrentPage: page, PerPage: perPage, Total: total, TotalPages: totalPages},
	})
}

// GetCustomerByPhone looks up a loyalty customer by phone number
func (h *LoyaltyHandler) GetCustomerByPhone(c *gin.Context) {
	phone := c.Param("phone")

	var cust models.LoyaltyCustomer
	var custName sql.NullString
	var tierID, tierName, tierColor sql.NullString
	var tierMinPoints sql.NullInt64
	var tierDiscount, tierPoints sql.NullFloat64
	var tierSortOrder sql.NullInt64

	err := h.db.QueryRow(`
		SELECT lc.id, lc.phone, lc.name, lc.total_points, lc.lifetime_spent, lc.created_at, lc.updated_at,
		       lt.id, lt.name, lt.min_points, lt.discount_percent, lt.points_per_dollar, lt.color, lt.sort_order
		FROM loyalty_customers lc
		LEFT JOIN loyalty_tiers lt ON lc.tier_id = lt.id
		WHERE lc.phone = $1
	`, phone).Scan(
		&cust.ID, &cust.Phone, &custName, &cust.TotalPoints, &cust.LifetimeSpent, &cust.CreatedAt, &cust.UpdatedAt,
		&tierID, &tierName, &tierMinPoints, &tierDiscount, &tierPoints, &tierColor, &tierSortOrder,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Customer not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch customer", Error: stringPtr(err.Error())})
		return
	}
	if custName.Valid {
		cust.Name = &custName.String
	}
	if tierID.Valid {
		id, _ := uuid.Parse(tierID.String)
		cust.TierID = &id
		cust.Tier = &models.LoyaltyTier{
			ID: id, Name: tierName.String, MinPoints: int(tierMinPoints.Int64),
			DiscountPercent: tierDiscount.Float64, PointsPerDollar: tierPoints.Float64,
			Color: tierColor.String, SortOrder: int(tierSortOrder.Int64),
		}
	}
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Customer found", Data: cust})
}

// GetStats returns loyalty program statistics
func (h *LoyaltyHandler) GetStats(c *gin.Context) {
	var totalMembers int
	var totalPoints int64
	var totalSpent float64
	h.db.QueryRow("SELECT COUNT(*), COALESCE(SUM(total_points), 0), COALESCE(SUM(lifetime_spent), 0) FROM loyalty_customers").
		Scan(&totalMembers, &totalPoints, &totalSpent)

	type TierStat struct {
		Name        string `json:"name"`
		Color       string `json:"color"`
		MemberCount int    `json:"member_count"`
	}
	tierStats := []TierStat{}
	rows, err := h.db.Query(`
		SELECT lt.name, lt.color, COUNT(lc.id) as member_count
		FROM loyalty_tiers lt
		LEFT JOIN loyalty_customers lc ON lc.tier_id = lt.id
		GROUP BY lt.id, lt.name, lt.color
		ORDER BY lt.sort_order
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var ts TierStat
			rows.Scan(&ts.Name, &ts.Color, &ts.MemberCount)
			tierStats = append(tierStats, ts)
		}
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true, Message: "Stats retrieved",
		Data: gin.H{
			"total_members":       totalMembers,
			"total_points_issued": totalPoints,
			"total_spent":         totalSpent,
			"tiers":               tierStats,
		},
	})
}

// AdjustPoints manually adjusts a customer's points (admin use)
func (h *LoyaltyHandler) AdjustPoints(c *gin.Context) {
	phone := c.Param("phone")
	var req struct {
		Points      int    `json:"points" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{Success: false, Message: "Invalid request", Error: stringPtr(err.Error())})
		return
	}

	var custID uuid.UUID
	var currentPoints int
	err := h.db.QueryRow("SELECT id, total_points FROM loyalty_customers WHERE phone = $1", phone).Scan(&custID, &currentPoints)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, models.APIResponse{Success: false, Message: "Customer not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{Success: false, Message: "Failed to fetch customer"})
		return
	}

	newPoints := currentPoints + req.Points
	if newPoints < 0 {
		newPoints = 0
	}
	h.db.Exec("UPDATE loyalty_customers SET total_points=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2", newPoints, custID)
	reassignTier(h.db, custID, newPoints)

	desc := req.Description
	txType := "adjust"
	h.db.Exec(
		"INSERT INTO loyalty_transactions (id, customer_id, points, transaction_type, description) VALUES ($1, $2, $3, $4, $5)",
		uuid.New(), custID, req.Points, txType, desc,
	)

	c.JSON(http.StatusOK, models.APIResponse{Success: true, Message: "Points adjusted", Data: gin.H{"new_total": newPoints}})
}

// EarnLoyaltyPoints awards points to a customer after a successful order.
// Called after order transaction commits — errors are logged, not fatal.
func EarnLoyaltyPoints(db *sql.DB, phone string, orderID uuid.UUID, totalAmount float64) {
	var custID uuid.UUID
	var currentPoints int
	var pointsPerDollar float64 = 1.0

	err := db.QueryRow("SELECT id, total_points FROM loyalty_customers WHERE phone = $1", phone).Scan(&custID, &currentPoints)
	if err == sql.ErrNoRows {
		// New customer — assign to lowest tier
		var lowestTierID *string
		db.QueryRow("SELECT id::text FROM loyalty_tiers ORDER BY min_points ASC LIMIT 1").Scan(&lowestTierID)
		db.QueryRow("SELECT COALESCE(points_per_dollar, 1.0) FROM loyalty_tiers ORDER BY min_points ASC LIMIT 1").Scan(&pointsPerDollar)

		custID = uuid.New()
		db.Exec("INSERT INTO loyalty_customers (id, phone, total_points, lifetime_spent, tier_id) VALUES ($1, $2, 0, 0, $3::uuid)", custID, phone, lowestTierID)
	} else if err != nil {
		log.Printf("loyalty: failed to look up customer %s: %v", phone, err)
		return
	} else {
		db.QueryRow(`
			SELECT COALESCE(lt.points_per_dollar, 1.0)
			FROM loyalty_customers lc
			LEFT JOIN loyalty_tiers lt ON lc.tier_id = lt.id
			WHERE lc.id = $1
		`, custID).Scan(&pointsPerDollar)
	}

	pointsEarned := int(math.Floor(totalAmount * pointsPerDollar))
	if pointsEarned <= 0 {
		return
	}

	newTotal := currentPoints + pointsEarned
	db.Exec("UPDATE loyalty_customers SET total_points=$1, lifetime_spent=lifetime_spent+$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3",
		newTotal, totalAmount, custID)
	reassignTier(db, custID, newTotal)

	desc := fmt.Sprintf("Earned from order %s", orderID.String()[:8])
	db.Exec(
		"INSERT INTO loyalty_transactions (id, customer_id, order_id, points, transaction_type, description) VALUES ($1, $2, $3, $4, 'earn', $5)",
		uuid.New(), custID, orderID, pointsEarned, desc,
	)
}

// reassignTier updates the customer's tier based on their current total points
func reassignTier(db *sql.DB, custID uuid.UUID, totalPoints int) {
	var newTierID string
	err := db.QueryRow("SELECT id::text FROM loyalty_tiers WHERE min_points <= $1 ORDER BY min_points DESC LIMIT 1", totalPoints).Scan(&newTierID)
	if err == nil {
		db.Exec("UPDATE loyalty_customers SET tier_id=$1::uuid WHERE id=$2", newTierID, custID)
	}
}
