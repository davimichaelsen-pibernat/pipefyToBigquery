const fs = require("fs");
const os = require("os");
const path = require("path");
const Logger = require("./Logger.js")
const { BigQuery } = require("@google-cloud/bigquery");

const bigquery = new BigQuery();

function createBQSchema(fields) {
    return fields.map(([name, type]) => {
        let bqType = "STRING";

        if (["date", "due_date", "date_time", "datetime"].includes(type)) {
            bqType = "TIMESTAMP";
        } else if (type === "number") {
            bqType = "FLOAT64";
        } else if (type === "id") {
            bqType = "INT64";
        }

        return { name, type: bqType };
    });
}

async function uploadCSV(projectId, datasetId, tableId, csv, fields) {
    const schema = createBQSchema(fields);

    const dataset = bigquery.dataset(datasetId, { projectId });
    const table = dataset.table(tableId);

    const tempFilePath = path.join(
        os.tmpdir(),
        `bq_upload_${Date.now()}.csv`
    );

    try {
        fs.writeFileSync(tempFilePath, csv, "utf-8");

        const metadata = {
            sourceFormat: "CSV",
            skipLeadingRows: 1,
            writeDisposition: "WRITE_TRUNCATE",
            schema: { fields: schema },
        };

        const [job] = await table.load(tempFilePath, metadata);

        Logger.info(`Job Finalizado: ${job.id}`);

        Logger.info(`Upload concluído: ${datasetId}.${tableId}`);
    } catch (err) {
        console.error("Erro no uploadCSV:", err);
        throw err;
    } finally {
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
}

async function syncSchema(projectId, datasetId, tableId, columnsArr) {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableId);

    // 1. Busca schema atual da tabela
    const [metadata] = await table.getMetadata();

    const existingColumns =
        metadata.schema?.fields?.map((f) => f.name.toLowerCase()) || [];

    // 2. Percorre colunas vindas do Pipefy
    for (const [name, type] of columnsArr) {
        if (existingColumns.includes(name.toLowerCase())) continue;

        Logger.info(`Coluna nova detectada: ${name}`);

        let colType = "STRING";

        if (["date", "due_date", "date_time", "datetime"].includes(type)) {
            colType = "TIMESTAMP";
        } else if (type === "number") {
            colType = "FLOAT64";
        } else if (type === "id") {
            colType = "INT64";
        }

        const query = `
        ALTER TABLE ${projectId}.${datasetId}.${tableId}
        ADD COLUMN ${name} ${colType}
      `;

        await bigquery.query({
            query,
            useLegacySql: false,
        });

        Logger.info(`Coluna adicionada: ${name}`);
    }
}

async function mergeData(
    projectId,
    datasetId,
    tableId,
    datasetIdIncr,
    tableIdIncr,
    primaryKey,
    columnsArr
  ) {

    const destinyPath = `${projectId}.${datasetId}.${tableId}`;
    const originPath = `${projectId}.${datasetIdIncr}.${tableIdIncr}`;
  
    const { columns, values, updateSet } = getColumns(columnsArr);
  
    const query = mergeQueryMaker(destinyPath, originPath, primaryKey, columns, values, updateSet)
  
    const [job] = await bigquery.createQueryJob({
      query,
      useLegacySql: false,
    });
  
    Logger.info(`MERGE job iniciado: ${job.id}`);
  
    // Aguarda conclusão (equivalente ao loop do Apps Script)
    let [metadata] = await job.getMetadata();
  
    while (metadata.status.state !== "DONE") {
      await new Promise((r) => setTimeout(r, 500));
      [metadata] = await job.getMetadata();
    }
  
    const errors = metadata.status?.errorResult;
    if (errors) {
      console.error("Erro no MERGE:", errors);
      throw new Error(JSON.stringify(errors));
    }
  
    Logger.info("MERGE concluído com sucesso.");
  }

  function mergeQueryMaker(destinyTableLocation, originTalbeLocation, primaryKey, columns, values, updateSet){
    let query = 
    `
      MERGE \`${destinyTableLocation}\` AS DESTINO
      USING \`${originTalbeLocation}\` AS ORIGEM
      ON DESTINO.\`${primaryKey}\` = ORIGEM.\`${primaryKey}\`
      WHEN MATCHED THEN 
        UPDATE SET ${updateSet}
      WHEN NOT MATCHED THEN
        INSERT (${columns})
        VALUES (${values})
    `
    return query
  }
  
  /**
   * Helper equivalente ao getColumns_ do Apps Script
   */
  function getColumns(columnsArr){
    let columns = ""
    let updateSet = ""
    let values = ""
  
    for(const column of columnsArr){
      if(columns != ""){
        columns += ", "
        updateSet += ", "
        values += ", "
      }
  
      const colEscaped = `\`${column}\``;
      
      columns += colEscaped;
      updateSet += `DESTINO.${colEscaped} = ORIGEM.${colEscaped}`;
      values += `ORIGEM.${colEscaped}`;
    }

    //Logger.info(columnValues)
    
    return{columns, values, updateSet};
  }
  

module.exports = {
    uploadCSV,
    syncSchema,
    mergeData
};