const { isNullOrNothing, formatToBQTimestamp, toCSVString } = require("./utils");
const { getPipeFields, getAllCards } = require("./pipefy");
const { uploadCSV, syncSchema, mergeData } = require("./bqClient");
const Logger = require("./Logger.js");

function dedupeFields(fieldsArr) {
  const map = new Map();
  fieldsArr.forEach(([name, type]) => {
    map.set(name, [name, type]);
  });
  return Array.from(map.values());
}

async function processPipefyToBQ({
  isIncremental,
  pipeId,
  pipefyToken,
  bqProject,
  bqDataset,
  bqTable,
  bqDatasetIncr,
  bqTableIncr,
  hoursDelay,
}) {
  if (
    isNullOrNothing(pipeId) ||
    isNullOrNothing(pipefyToken) ||
    isNullOrNothing(bqProject) ||
    isNullOrNothing(bqDataset) ||
    isNullOrNothing(bqTable)
  ) {
    throw new Error("Variáveis obrigatórias ausentes");
  }

  Logger.info(
    `Iniciando carga ${isIncremental ? "INCREMENTAL" : "TOTAL"} - Pipe ${pipeId}`
  );

  // 1. Fields
  const pipeData = await getPipeFields(pipefyToken, pipeId);

  let fieldsArr = [];

  pipeData.data.pipe.phases.forEach((phase) => {
    phase.fields.forEach((f) => {
      if(f.type != "statement"){
        fieldsArr.push([f.id, f.type])
      }
    });
  });

  pipeData.data.pipe.start_form_fields.forEach((f) =>{
    if(f.type != "statement"){
      fieldsArr.push([f.id, f.type])
    }
  });

  fieldsArr.push(["node_id", "id"]);

  fieldsArr = dedupeFields(fieldsArr);

  // 2. Cards
  let updatedAt = null;

  if (isIncremental && hoursDelay) {
    updatedAt = new Date(Date.now() - hoursDelay * 3600000).toISOString();
  }

  const cards = await getAllCards(pipefyToken, pipeId, updatedAt);

  if (!cards.length) {
    Logger.info("Nenhum dado encontrado.");
    return;
  }

  // 3. Transform
  const headers = fieldsArr.map((f) => f[0]);

  const processed = cards.map((card) => {
    const obj = { node_id: card.id };

    card.fields.forEach((f) => {
      if (!f.field) return;

      let val = f.native_value;

      if (
        ["date", "due_date", "date_time", "datetime"].includes(
          f.field.type
        )
      ) {
        val = formatToBQTimestamp(val);
      }
      if(f.field.type != "statement"){
        obj[f.field.id] = val;
      }

    });

    return obj;
  });

  const csv = toCSVString(processed, headers);

  // 4. Load
  if (isIncremental) {
    await uploadCSV(bqProject, bqDatasetIncr, bqTableIncr, csv, fieldsArr);

    await syncSchema(bqProject, bqDataset, bqTable, fieldsArr);

    await mergeData(
      bqProject,
      bqDataset,
      bqTable,
      bqDatasetIncr,
      bqTableIncr,
      "node_id",
      headers
    );
  } else {
    await uploadCSV(bqProject, bqDataset, bqTable, csv, fieldsArr);
  }

  Logger.info("Carga finalizada com sucesso.");
}

async function pipefyToBQIncremental(...args) {
  const [
    pipeId,
    pipefyToken,
    bqProject,
    bqDataset,
    bqTable,
    bqDatasetIncr,
    bqTableIncr,
    hoursDelay,
  ] = args;

  return processPipefyToBQ({
    isIncremental: true,
    pipeId,
    pipefyToken,
    bqProject,
    bqDataset,
    bqTable,
    bqDatasetIncr,
    bqTableIncr,
    hoursDelay,
  });
}

async function pipefyToBQ(...args) {
  const [pipeId, pipefyToken, bqProject, bqDataset, bqTable] = args;

  return processPipefyToBQ({
    isIncremental: false,
    pipeId,
    pipefyToken,
    bqProject,
    bqDataset,
    bqTable,
  });
}

module.exports = {
  pipefyToBQ,
  pipefyToBQIncremental,
};