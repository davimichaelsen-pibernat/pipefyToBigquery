const Logger = require("./Logger.js")

const isNullOrNothing = (prop) =>
    prop === "" || prop === null || prop === undefined;
  
  const formatToBQTimestamp = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";
  
    let cleaned = dateStr.trim();
  
    const regexBR = /^(\d{2})\/(\d{2})\/(\d{4})(.*)$/;
    const matchBR = cleaned.match(regexBR);
  
    if (matchBR) {
      const [, day, month, year, rest] = matchBR;
      cleaned = `${year}-${month}-${day}${rest || ""}`;
    }
  
    if (cleaned.length === 10) cleaned += " 00:00:00";
    if (cleaned.length === 16) cleaned += ":00";
  
    return cleaned;
  };
  
  const toCSVString = (data, headers) => {
    const rows = [];
  
    // header
    rows.push(headers.map(h => `"${h}"`).join(","));
  
    for (const item of data) {
      const row = headers.map(header => {
        let val = item[header];
  
        if (val === null || val === undefined) val = "";
  
        const cleanVal = String(val)
          .replace(/[\n\r]+/g, " ")
          .replace(/"/g, '""');
  
        return `"${cleanVal}"`;
      });
  
      rows.push(row.join(","));
    }
  
    return rows.join("\n");
  };
  
  module.exports = {
    isNullOrNothing,
    formatToBQTimestamp,
    toCSVString,
  };