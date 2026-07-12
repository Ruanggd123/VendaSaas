interface Rule {
  id: string;
  condition: (message: string) => boolean;
  action: () => void;
}

class RulesEngine {
  private rules: Rule[] = [];

  addRule(condition: (message: string) => boolean, action: () => void) {
    const rule: Rule = {
      id: Math.random().toString(36).substr(2, 9),
      condition,
      action
    };
    this.rules.push(rule);
  }

  processMessage(message: string) {
    this.rules.forEach(rule => {
      if (rule.condition(message)) {
        rule.action();
      }
    });
  }
}

export default new RulesEngine();
