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

	score struct {
		Points      int    `json:"points"`
		Task        string `json:"task"`
		TotalPoints int    `json:"total_points"`
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

func (st *store) Put(key time.Time, val interface{}) error {
	log.Printf("PUT: key: %v, val: %v\n", key, val)
	bytesVal, err := json.Marshal(val)
	if err != nil {
		return err
	}
	bytesKey := []byte(key.Format(time.RFC3339))
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

func (st *store) GetAllHandler() fiber.Handler {
	return func(c *fiber.Ctx) error {
		log.Println("gel all scores")
		res, err := st.GeScoresList()
		if err != nil {
			log.Println("ERROR: cannot get all scores", err)
			return c.Context().Err()
		}
		return c.Status(fiber.StatusOK).JSON(res)
	}
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

func (st *store) GeScoresList() ([]score, error) {
	log.Printf("GET: list\n")
	res := []score{}
	err := st.db.View(func(tx *bolt.Tx) error {
		return tx.Bucket(st.backetName).ForEach(func(k, v []byte) error {
			s := score{}
			err := json.Unmarshal(v, &s)
			if err != nil {
				return err
			}
			res = append(res, s)
			return nil
		})
	})
	reverse(res)
	log.Printf("list: %v\n", res)
	return res, err
}

func runHub(st *store) {
	for {
		select {
		case connection := <-register:
			log.Println("connection registered")
			c := &client{}
			clients[connection] = c
			scoreList, err := st.GeScoresList()
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

			scoreList, err := st.GeScoresList()
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
