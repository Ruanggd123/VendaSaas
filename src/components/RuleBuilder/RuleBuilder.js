import React, { useState, useEffect } from 'react';
import './RuleBuilder.css';

const RuleBuilder = () => {
  const [rules, setRules] = useState([]);
  const [currentRule, setCurrentRule] = useState({
    trigger: '',
    actions: [],
    conditions: []
  });

  useEffect(() => {
    // Carregar regras existentes
    fetch('/api/rules')
      .then(response => response.json())
      .then(data => setRules(data));
  }, []);

  const handleAddAction = (action) => {
    setCurrentRule(prev => ({
      ...prev,
      actions: [...prev.actions, action]
    }));
  };

  const handleSaveRule = () => {
    fetch('/api/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentRule),
    })
    .then(response => response.json())
    .then(newRule => {
      setRules([...rules, newRule]);
      setCurrentRule({
        trigger: '',
        actions: [],
        conditions: []
      });
    });
  };

  return (
    <div className="rule-builder">
      <div className="rules-list">
        <h3>Regras Existentes</h3>
        {rules.map((rule, index) => (
          <div key={index} className="rule-item">
            <h4>{rule.trigger}</h4>
            <p>Ações: {rule.actions.join(', ')}</p>
          </div>
        ))}
      </div>
      
      <div className="rule-editor">
        <h3>Criar Nova Regra</h3>
        <div className="form-group">
          <label>Trigger:</label>
          <input
            type="text"
            value={currentRule.trigger}
            onChange={(e) => setCurrentRule({...currentRule, trigger: e.target.value})}
          />
        </div>
        
        <div className="actions-section">
          <h4>Ações</h4>
          <button onClick={() => handleAddAction('Enviar Email')}>Enviar Email</button>
          <button onClick={() => handleAddAction('Criar Tarefa')}>Criar Tarefa</button>
          <button onClick={() => handleAddAction('Atualizar Status')}>Atualizar Status</button>
        </div>
        
        <button className="save-button" onClick={handleSaveRule}>Salvar Regra</button>
      </div>
    </div>
  );
};

export default RuleBuilder;
