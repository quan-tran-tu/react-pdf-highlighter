const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./highlights.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    db.run(
      `CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        pdf_url TEXT,
        position TEXT,
        content TEXT,
        comment TEXT
      )`
    );
  }
});

app.use(cors({ origin: "http://localhost:3003" }));

const pdfDir = "./pdf/";

// Serve the list of PDFs in the ./pdf/ folder
app.get("/api/pdfs", (req, res) => {
  fs.readdir(pdfDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Unable to read PDF directory" });
    }

    const pdfFiles = files.filter((file) => file.endsWith(".pdf"));
    res.json(pdfFiles);
  });
});

// Serve static PDF files
app.use("/pdf", express.static("./pdf/"));

// Get highlights from the database
app.get("/api/highlights", (req, res) => {
  const { pdfUrl } = req.query;

  db.all("SELECT * FROM highlights WHERE pdf_url = ?", [pdfUrl], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.json([]);
    }

    res.json(rows.map(row => ({
      id: row.id,
      position: JSON.parse(row.position),
      content: JSON.parse(row.content),
      comment: JSON.parse(row.comment),
    })));
  });
});

// Write highlights to the database
app.post("/api/highlights", (req, res) => {
  const { id, pdfUrl, position, content, comment } = req.body;

  if (!id || !pdfUrl || !position || !content || !comment) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    `INSERT INTO highlights (id, pdf_url, position, content, comment)
     VALUES (?, ?, ?, ?, ?)`,
    [id, pdfUrl, JSON.stringify(position), JSON.stringify(content), JSON.stringify(comment)],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
