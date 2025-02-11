import { NextApiRequest, NextApiResponse } from "next";
import { Codex } from "@codex-data/sdk";

const DEFINED_API_KEY = "aac2263ab4a606f796631215138279923f13e57a";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { symbol, from, to, resolution } = req.query;

    if (!symbol || !from || !to || !resolution) {
      return res.status(400).json({
        message: "Missing required parameters: symbol, from, to, resolution",
      });
    }

    const codex = new Codex(DEFINED_API_KEY);

    const response = await codex.queries.getBars({
      symbol: symbol as string,
      from: parseInt(from as string),
      to: parseInt(to as string),
      resolution: (resolution as string).replace("S", ""),
      removeEmptyBars: true,
    });

    if (!response?.getBars) {
      return res.status(404).json({ message: "No data found" });
    }

    return res.status(200).json(response.getBars);
  } catch (error) {
    console.error("Error fetching bars:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
