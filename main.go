package main

import (
	"encoding/json"
	"errors"
	"flag"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	bolt "go.etcd.io/bbolt"
)

// Add more data to this type if needed
type (
	client struct {
		isClosing bool
		mu        sync.Mutex
	}

	response struct {
		TotalPoints   int     `json:"total_points"`
		TotalStartsAt int     `json:"total_starts_at"`
		ScoreData     []score `json:"data"`
	}

	score struct {
		AddedAt     time.Time `json:"added_at"`
		Points      int       `json:"points"`
		Task        string    `json:"task"`
		TotalPoints int       `json:"total_points"`
	}

	store struct {
		backetName []byte
		db         *bolt.DB
	}
)

var clients = make(map[*websocket.Conn]*client) // Note: although large maps with pointer-like types (e.g. strings) as keys are slow, using pointers themselves as keys is acceptable and fast
var register = make(chan *websocket.Conn)
var broadcast = make(chan string)
var unregister = make(chan *websocket.Conn)

func main() {

	// Create and connect to DB
	db, err := bolt.Open("score.db", 0600, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	store, err := NewStore(db, "score")
	if err != nil {
		log.Fatal(err)
	}

	app := fiber.New()

	app.Static("/", "./public")
	app.Get("/api/score/", store.GetAllHandler())
	app.Get("/api/score/:starttime/:endtime", store.GetAllHandler())
	app.Get("/api/score/:starttime", store.GetAllHandler())
	app.Put("/api/score/:time", store.PutHandler())
	app.Put("/api/score/", store.PutHandler())

	app.Use(func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) { // Returns true if the client requested upgrade to the WebSocket protocol
			return c.Next()
		}
		return c.SendStatus(fiber.StatusUpgradeRequired)
	})

	go runHub(store)

	app.Get("/ws", websocket.New(func(c *websocket.Conn) {
		// When the function returns, unregister the client and close the connection
		defer func() {
			unregister <- c
			c.Close()
		}()

		// Register the client
		register <- c

		for {
			messageType, message, err := c.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Println("read error:", err)
				}

				return // Calls the deferred function, i.e. closes the connection on error
			}

			if messageType == websocket.TextMessage {
				// Broadcast the received message
				broadcast <- string(message)
			} else {
				log.Println("websocket message received of type", messageType)
			}
		}
	}))

	addr := flag.String("addr", ":8080", "http service address")
	flag.Parse()
	log.Fatal(app.Listen(*addr))
}

func NewStore(db *bolt.DB, backetName string) (*store, error) {
	st := &store{
		backetName: []byte(backetName),
		db:         db,
	}
	if db == nil {
		return nil, errors.New("DB is not ready")
	}

	err := st.db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(backetName))
		return err
	})
	return st, err
}
func (st *store) PutHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		log.Println("gel all scores")

		putTimeStr := c.Params("time")

		putTime, err := strToUnixTime(putTimeStr)
		if err != nil {
			log.Println("ERROR: cannot parse start time ")
			return c.Status(fiber.StatusBadRequest).Send([]byte("cannot parse start time"))
		}

		if putTime == nil {
			t := time.Now()
			putTime = &t
		}

		val := score{}
		if err := c.BodyParser(&val); err != nil {
			return c.Status(fiber.StatusBadRequest).Send([]byte("cannot parse score payload"))
		}
		if (val.AddedAt == time.Time{}) {
			val.AddedAt = *putTime
		}

		if err = st.Put(*putTime, val); err != nil {
			return c.Status(fiber.StatusInternalServerError).Send([]byte("cannot put score"))
		}

		return c.Status(fiber.StatusOK).JSON(st)
	}
}

func (st *store) GetAllHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		log.Println("gel all scores")

		startTimeStr := c.Params("starttime")
		endTimeStr := c.Params("endtime")

		startTime, err := strToUnixTime(startTimeStr)
		if err != nil {
			log.Println("ERROR: cannot parse start time ")
			return c.Status(fiber.StatusBadRequest).Send([]byte("cannot parse start time"))
		}

		endTime, err := strToUnixTime(endTimeStr)
		if err != nil {
			log.Println("ERROR: cannot parse end time ")
			return c.Status(fiber.StatusBadRequest).Send([]byte("cannot parse end time"))
		}

		totalPoints, err := st.GetTotalScore()
		if err != nil {
			log.Println("ERROR: cannot get total points", err)
			return c.Context().Err()
		}

		res, err := st.GeScoresList(startTime, endTime)
		if err != nil {
			log.Println("ERROR: cannot get all scores", err)
			return c.Context().Err()
		}
		res.TotalPoints = totalPoints

		return c.Status(fiber.StatusOK).JSON(res)
	}
}

func (st *store) Put(key time.Time, val interface{}) error {
	bytesVal, err := json.Marshal(val)
	if err != nil {
		return err
	}
	strKey := strconv.FormatInt(key.Unix(), 10)
	bytesKey := []byte(strKey)
	log.Printf("PUT: key: %v, val: %v\n", strKey, val)
	return st.db.Update(func(tx *bolt.Tx) error {
		return tx.Bucket(st.backetName).Put(bytesKey, bytesVal)
	})
}

func (st *store) Get(key string, val interface{}) error {
	log.Printf("GET: key: %v\n", key)
	bytesKey := []byte(key)
	return st.db.View(func(tx *bolt.Tx) error {
		bytesVal := tx.Bucket(st.backetName).Get(bytesKey)
		return json.Unmarshal(bytesVal, &val)
	})
}

func (st *store) GetTotalScore() (int, error) {
	log.Printf("GET: total\n")
	res := 0
	err := st.db.View(func(tx *bolt.Tx) error {
		return tx.Bucket(st.backetName).ForEach(func(k, v []byte) error {
			s := score{}
			err := json.Unmarshal(v, &s)
			if err != nil {
				return err
			}
			res = res + s.Points
			return nil
		})
	})
	log.Printf("total: %d\n", res)
	return res, err
}

func (st *store) GeScoresList(startDate, endDate *time.Time) (response, error) {
	log.Println("GET: list", startDate, endDate)
	scoresList := []score{}
	total := 0
	err := st.db.View(func(tx *bolt.Tx) error {
		return tx.Bucket(st.backetName).ForEach(func(k, v []byte) error {
			intKey, _ := strconv.Atoi(string(k))
			// All
			if startDate == nil && endDate == nil {
				log.Printf("all key: %v, val: %v \n", intKey, string(v))
				scoresList, total = st.appendToResponse(scoresList, total, k, v)
				// Filter by start
			} else if (startDate != nil && endDate == nil) && intKey >= int(startDate.Unix()) {
				log.Printf("starts at %v ; key: %v, val: %v \n", int(startDate.Unix()), intKey, string(v))
				scoresList, total = st.appendToResponse(scoresList, total, k, v)

				// Filter by start and end dates
			} else if intKey >= int(startDate.Unix()) && intKey <= int(endDate.Unix()) {
				log.Printf("beetwen  %v - %v; key: %v, val: %v \n", int(startDate.Unix()), int(endDate.Unix()), intKey, string(v))
				scoresList, total = st.appendToResponse(scoresList, total, k, v)

				// 	// Filter by end dates
				// } else if endDate != nil && intKey <= int(endDate.Unix()) {
				// 	scoresList = st.appendToResponse(scoresList, v)
			}

			return nil
		})
	})
	reverse(scoresList)
	log.Printf("list: %v\n", scoresList)

	res := response{
		TotalStartsAt: total,
		ScoreData:     scoresList,
	}

	return res, err
}

func (st *store) appendToResponse(res []score, points int, k, v []byte) ([]score, int) {
	s := score{}
	err := json.Unmarshal(v, &s)
	if err != nil {
		log.Println("ERROR: cannot unmarshal and apend record", err)
	}
	tUnix, err := strconv.Atoi(string(k))
	if err != nil {
		log.Println("ERROR: convert time", err)
	}
	s.AddedAt = time.Unix(int64(tUnix), 0)
	res = append(res, s)
	points = points + s.Points
	return res, points
}

func runHub(st *store) {
	for {
		select {
		case connection := <-register:
			log.Println("connection registered")
			c := &client{}
			clients[connection] = c
			scoreList, err := st.GeScoresList(nil, nil)
			if err != nil {
				log.Println("ERROR: Cannot put total score", err)
			}
			go send(connection, c, scoreList)

		case message := <-broadcast:
			log.Println("message received:", message)
			i := strings.Index(message, " ")
			t := message[i+1:]
			p, _ := strconv.Atoi(message[:i])
			s := score{
				Task:   t,
				Points: p,
			}
			k := time.Now()
			err := st.Put(k, s)
			if err != nil {
				log.Println("ERROR: Cannot put score", err)
			}

			scoreList, err := st.GeScoresList(nil, nil)
			if err != nil {
				log.Println("ERROR: Cannot put total score", err)
			}

			log.Println("Send the message to all clients")

			// Send the message to all clients
			for connection, c := range clients {
				go send(connection, c, scoreList)
			}

		case connection := <-unregister:
			// Remove the client from the hub
			delete(clients, connection)

			log.Println("connection unregistered")
		}
	}
}

func send(connection *websocket.Conn, c *client, s interface{}) { // send to each client in parallel so we don't block on a slow client
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.isClosing {
		return
	}
	scoreJson, err := json.Marshal(s)
	if err != nil {
		log.Println("write error:", err)
		connection.WriteMessage(websocket.CloseMessage, []byte{})
	}
	if err := connection.WriteMessage(websocket.TextMessage, scoreJson); err != nil {
		c.isClosing = true
		log.Println("write error:", err)

		connection.WriteMessage(websocket.CloseMessage, []byte{})
		connection.Close()
		unregister <- connection
	}
}

func reverse[S ~[]E, E any](s S) {
	for i, j := 0, len(s)-1; i < j; i, j = i+1, j-1 {
		s[i], s[j] = s[j], s[i]
	}
}

func strToUnixTime(str string) (*time.Time, error) {
	if len(str) > 0 {
		st, err := strconv.Atoi(str)
		if err != nil {
			log.Println("ERROR: cannot parse start time ")
			return nil, err
		}
		t := time.Unix(int64(st), 0)
		return &t, nil
	} else {
		return nil, nil
	}
}
