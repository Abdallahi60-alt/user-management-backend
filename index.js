require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/config/swagger');
const mobileUserRoutes = require('./src/routes/mobileUserRoutes');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const finProfileRoutes = require('./src/routes/finProfileRoutes');
const fundRoutes = require('./src/routes/fundRoutes');
const subscriptionRoutes = require('./src/routes/subscriptionRoutes');
const palmRoutes = require('./src/routes/palmRoutes');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/mobileUsers', mobileUserRoutes);
app.use('/finprofile', finProfileRoutes);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (req, res) => res.json(swaggerSpec));
app.use('/funds', fundRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/palm', palmRoutes);



app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server on :${PORT}`);
  console.log(`Docs  on :${PORT}/docs`);
});