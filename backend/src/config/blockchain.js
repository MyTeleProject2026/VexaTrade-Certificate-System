const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getConfig() {
  return {
    enabled: String(process.env.BLOCKCHAIN_ENABLED || "false") === "true",
    apiUrl: process.env.BLOCKCHAIN_API_URL || "",
    apiKey: process.env.BLOCKCHAIN_API_KEY || "",
    network: process.env.BLOCKCHAIN_NETWORK || "mainnet",
    contractAddress: process.env.BLOCKCHAIN_CONTRACT_ADDRESS || "",
  };
}

async function anchorCertificate(payload) {
  const config = getConfig();
  const securityHash = sha256(JSON.stringify(payload));

  if (!config.enabled) {
    return {
      anchored: false,
      securityHash,
      network: config.network,
      reason: "Blockchain integration is disabled",
    };
  }

  if (!config.apiUrl || !config.apiKey) {
    throw new Error("BLOCKCHAIN_API_URL and BLOCKCHAIN_API_KEY are required when blockchain is enabled");
  }

  const response = await fetch(`${config.apiUrl.replace(/\/$/, "")}/certificates/anchor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ payload, securityHash, network: config.network, contractAddress: config.contractAddress }),
  });

  if (!response.ok) throw new Error(`Blockchain API returned ${response.status}`);
  const data = await response.json();

  return {
    anchored: true,
    securityHash,
    network: data.network || config.network,
    transactionHash: data.transactionHash || data.txHash,
    blockNumber: data.blockNumber,
    ipfsHash: data.ipfsHash,
  };
}

module.exports = { getConfig, anchorCertificate, sha256 };
