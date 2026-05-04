const axios = require("axios");
const Logger = require("./Logger.js")

async function pipefyRequest(token, query) {
  const response = await axios.post(
    "https://api.pipefy.com/graphql",
    { query },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.data.errors) {
    throw new Error(JSON.stringify(response.data.errors));
  }

  return response.data;
}

async function getPipeFields(token, pipeId) {
  const query = `
  {
    pipe(id: ${pipeId}) {
      phases {
        fields { id type }
      }
      start_form_fields {
        id type
      }
    }
  }`;

  return await pipefyRequest(token, query);
}

async function getAllCards(token, pipeId, updatedAt = null) {
  let nodes = [];
  let hasNext = true;
  let endCursor = "";
  let safety = 0;

  while (hasNext && safety < 1000) {
    safety++;

    let filters = `pipeId: ${pipeId}`;
    if (endCursor) filters += `, after: "${endCursor}"`;

    if (updatedAt) {
      filters += `, filter: {field: "updated_at", operator: gt, value: "${updatedAt}"}`;
    }

    const query = `
    {
      allCards(${filters}) {
        nodes {
          id
          updated_at
          fields {
            native_value
            field { id type }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`;

    const result = await pipefyRequest(token, query);
    const data = result.data.allCards;

    nodes.push(...data.nodes);
    hasNext = data.pageInfo.hasNextPage;
    endCursor = data.pageInfo.endCursor;
  }

  return nodes;
}

module.exports = {
  getPipeFields,
  getAllCards,
};