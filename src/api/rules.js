import express from 'express';
const router = express.Router();

let rules = [];

// Obter todas as regras
router.get('/', (req, res) => {
  res.json(rules);
});

// Criar nova regra
router.post('/', (req, res) => {
  const newRule = {
    id: Date.now(),
    ...req.body
  };
  rules.push(newRule);
  res.status(201).json(newRule);
});

export default router;
