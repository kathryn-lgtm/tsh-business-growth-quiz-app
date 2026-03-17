const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("TSH Business Growth Quiz backend is running.");
});

app.get("/quiz-submit", (req, res) => {
  res.json({
    ok: true,
    message: "Quiz proxy GET is working"
  });
});

app.post("/quiz-submit", (req, res) => {
  console.log("QUIZ DATA RECEIVED:");
  console.log(JSON.stringify(req.body, null, 2));

  res.json({
    ok: true,
    message: "Quiz received successfully",
    received_at: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});