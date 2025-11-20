const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// בדיקת חיים בסיסית
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'ELAD Mission Control API' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
