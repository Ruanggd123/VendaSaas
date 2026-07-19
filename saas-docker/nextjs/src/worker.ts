import { messageWorker, sendWorker } from "./lib/queue";

console.log("🔥 BullMQ Workers iniciados com sucesso!");

// Mantém o processo vivo
process.on("SIGINT", async () => {
  console.log("Desligando workers...");
  await messageWorker?.close();
  await sendWorker?.close();
  process.exit(0);
});
