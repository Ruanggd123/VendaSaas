import { describe, it, expect } from "vitest";
import { resolveChoiceIndex } from "./rulesBot";

describe("resolveChoiceIndex", () => {
  const products = ["Site Institucional", "Plataforma Completa", "Plano Site Grátis"];

  it("resolve por número", () => {
    expect(resolveChoiceIndex("1", products)).toBe(0);
    expect(resolveChoiceIndex("2", products)).toBe(1);
    expect(resolveChoiceIndex("3", products)).toBe(2);
  });

  it("resolve por nome exato", () => {
    expect(resolveChoiceIndex("Plataforma Completa", products)).toBe(1);
    expect(resolveChoiceIndex("Site Institucional", products)).toBe(0);
  });

  it("resolve por nome com preço", () => {
    expect(resolveChoiceIndex("Site Institucional - R$ 497", products)).toBe(0);
    expect(resolveChoiceIndex("Plano Site Grátis - R$ 97/mês", products)).toBe(2);
  });

  it("retorna -1 para produto inexistente", () => {
    expect(resolveChoiceIndex("Produto inexistente - R$ 10", products)).toBe(-1);
  });

  it("resolve datas", () => {
    const dates = ["Terça-feira (28/07)", "Quarta-feira (29/07)"];
    expect(resolveChoiceIndex("Terça-feira (28/07)", dates)).toBe(0);
    expect(resolveChoiceIndex("tercafeira 2807", dates)).toBe(0);
    expect(resolveChoiceIndex("2", dates)).toBe(1);
  });

  it("resolve horários", () => {
    expect(resolveChoiceIndex("14:30", ["14:30", "15:00"])).toBe(0);
    expect(resolveChoiceIndex("1430", ["14:30", "15:00"])).toBe(0);
  });

  it("resolve opções de entrega", () => {
    expect(resolveChoiceIndex("Entrega Física", ["Envio Digital", "Entrega Física"])).toBe(1);
  });

  it("resolve confirmação/cancelamento", () => {
    expect(resolveChoiceIndex("Confirmar", ["Confirmar", "Cancelar"])).toBe(0);
    expect(resolveChoiceIndex("Cancelar", ["Confirmar", "Cancelar"])).toBe(1);
  });

  it("resolve métodos de pagamento", () => {
    expect(resolveChoiceIndex("PIX", ["PIX", "Cartão de Crédito"])).toBe(0);
    expect(resolveChoiceIndex("Cartão de Crédito", ["PIX", "Cartão de Crédito"])).toBe(1);
    expect(resolveChoiceIndex("Pagar com Cartão", ["Pagar com PIX", "Pagar com Cartão", "Cancelar cobrança"])).toBe(1);
  });

  it("resolve período do dia", () => {
    expect(resolveChoiceIndex("Tarde", ["Manhã", "Tarde"])).toBe(1);
  });
});
