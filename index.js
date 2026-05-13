const { pipefyToBQIncremental, pipefyToBQ } = require("./bigquery");
const config = require("./config/config.json")
const Logger = require("./Logger.js")

Logger.createLogFile("./logs/general.log", ["info", "debug", "warning", "error"])

process.env.GOOGLE_APPLICATION_CREDENTIALS = config.GBQ_PATH
process.env.NODE_EXTRA_CA_CERTS = "combined-certs.pem"

async function main() {
    const tokenBq = await getPipefyAccessToken();
    const tables = config.TABLES_LIST;

    for(const table of tables){
        await pipefyToBQ(
            table.PIPE_ID,
            tokenBq,
            table.PROJECT_ID,
            table.DATASET_ID,
            table.TABLE_ID
        );
        // await pipefyToBQIncremental(
        //     table.PIPE_ID,
        //     tokenBq,
        //     table.PROJECT_ID,
        //     table.DATASET_ID,
        //     table.TABLE_ID,
        //     table.DATASET_ID_INCR,
        //     table.TABLE_ID_INCR,
        //     2
        // );
    }


    // (async () => {
    //     await pipefyToBQIncremental(
    //         "306998372",
    //         tokenBq,
    //         "warehouse-pibernat",
    //         "SPA",
    //         "EUROFARMA_CARDS_TESTE",
    //         "pipefy_tables_incr",
    //         "EUROFARMA_CARDS_INCR",
    //         2
    //     );
    // })();

    //PipefyToBQ.pipefyToBQIncremental("306998372", getPipefyAccessToken(), "warehouse-pibernat", "SPA", "EUROFARMA_CARDS", "pipefy_tables_incr", "EUROFARMA_CARDS_INCR", 2)
    //PipefyToBQ.pipefyToBQ("306998372", getPipefyAccessToken(), "warehouse-pibernat", "SPA", "EUROFARMA_CARDS")
}


async function getPipefyAccessToken() {
    const response = await fetch("https://app.pipefy.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: config.PIPEFY_CREDENTIALS.CLIENT_ID,
        client_secret: config.PIPEFY_CREDENTIALS.CLIENT_SECRET,
      }),
    });
  
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
  
    const data = await response.json();
  
    if (!data.access_token) {
      throw new Error("Token não veio na resposta");
    }
  
    return data.access_token;
  }


main()